"use strict"

// Imports
import * as sb from './svgbuilder.js'
import { makeQRCode, canScan, scan } from './qrhandling.js'
import {
    requireLandscape,
    getParamString,
    setParamsFromString,
    makeBookmarkable,
    download
} from './ui.js'

const svg = document.querySelector("svg")

function toRad(angle) {
    return angle / 360 * 2 * Math.PI
}


// Describe your model and UI here

let thickness = 2;

const cutProps = {
    stroke: 'black',
    'stroke-width': 0.5,
}
const engraveProps = {
    stroke: 'red',
    'stroke-width': 0.5,
}

class Wing extends sb.Drawable {
    constructor(parent = undefined) {
        super(parent)
        this.makeProp('length', 0)
        this.makeProp('width', 0)
        this.makeProp('angle', 0)

        this.createRootElem('path', cutProps)
        this.makeTooltip('Tragfläche')
    }

    update() {
        const sinAngle = Math.sin(this.angle * (2*Math.PI/360))
        const tipWidth = this.width * 0.45
        const baseWidthRest = this.width - tipWidth
        
        const d = new sb.PathD(0, 0)
            .line(this.length, baseWidthRest + this.length * sinAngle)
            .vLine(tipWidth)
            .line(-this.length, -this.length * sinAngle)
            .close()
        this.elem.setAttribute('d', d)
    }
}

class Fuselage extends sb.Drawable {
    constructor(parent = undefined) {
        super(parent)
        this.makeProp('length', 200)
        this.makeProp('height', 50)
        this.makeProp('stabiliserWidth', 20)
        // todo: stabiliserAngle ?

        this.createRootElem('path', cutProps)
        this.makeTooltip('Rumpf')
    }

    update() {
        const fourthL = this.length/4
        const noseCone = this.height/6
        
        const d = new sb.PathD(0, 0)
            .line(fourthL * 3, this.height/3)
            .vLine(this.height/3/2 - thickness/2)
            .hLine(-this.stabiliserWidth/2)
            .vLine(thickness)
            .hLine(this.stabiliserWidth/2)
            .vLine(this.height/3/2 - thickness/2)
            .line(-fourthL * 3, this.height/3)
            // boxy nose
            //  .hLine(-this.length/8)
            //  .line(-this.length/8 + noseCone, -this.height/6)
            //  .vLine(-this.height/3)
            // rounded nose
            .add(`t ${-fourthL/2} ${0}`)  // bottom of cockpit
            .add(`t ${-fourthL/2} ${-this.height/4}`)  // bottom of cockpit
            .add(`t ${fourthL/4} ${-this.height/3}`)  // bottom of cockpit
            .add(`T 0 0`)  // finish cockpit
        
        const stabiliserD = new sb.PathD(fourthL * 3, this.height/3)
            .hLine(-this.stabiliserWidth)
            .line(this.stabiliserWidth/2, -this.height*1.1)
            .hLine(this.stabiliserWidth/2)
            .close()
        
        const union = d.union(stabiliserD)
        
        this.elem.setAttribute('d', union)
    }
}

class Stabiliser extends sb.Drawable {
    constructor(parent = undefined) {
        super(parent)
        this.makeProp('length', 0)
        this.makeProp('width', 0)
        // todo: angle?

        this.createRootElem('path', cutProps)
        this.makeTooltip('Höhenleitwerk')
    }

    update() {
        const tipWidth = this.width * 0.75
        const baseWidthRest = this.width - tipWidth
        
        const d = new sb.PathD(0, 0)
            .line(this.length/2, baseWidthRest/3*1)
            .vLine(tipWidth)
            .line(-this.length/2 + thickness/2, baseWidthRest/3*2)
            .vLine(-this.width/2)
            .hLine(-thickness/2)
            .close()
        const firstHalf = this.createElem('path', {d: d})
        
        const mirroredCopy = sb.mirrorX(firstHalf, 0, 0, true)
        const bothHalves = this.union(firstHalf, mirroredCopy)
        this.elem.setAttribute('d', bothHalves)
    }
}


class WingAdapter extends sb.Drawable {
    constructor(girth = 5+thickness, parent = undefined) {
        super(parent)
        this.makeProp('angle', 30)
        this.makeProp('girth', girth)

        this.createRootElem('path', cutProps)
        this.makeTooltip('Adapter für Flügelmontage')
    }

    update() {
        const d = new sb.PathD(0, -0.2)
            .hLine(this.girth)
            .vLine(this.girth * 4 + 0.2)
            .hLine(-this.girth + thickness/2)
            .vLine(-this.girth * 2.8)
            .hLine(-thickness/2)
            .close()
        const tmpSvgPath = this.createElem('path', {d: d})
        const mirroredCopy = sb.mirrorX(tmpSvgPath, 0, 0, true)
        const bottom = this.union(tmpSvgPath, mirroredCopy)
        
        tmpSvgPath.setAttribute('d', bottom)
        const leftSide = sb.rotate(tmpSvgPath, -90 - this.angle/2, 0, 0, true)
        const rightSide = sb.rotate(tmpSvgPath, 90 + this.angle/2, 0, 0, true)
        
        const bottomAndLeft = this.union(bottom, leftSide)
        const all = this.union(bottomAndLeft, rightSide)
        
        this.elem.setAttribute('d', all)
    }
}


function init() {
    // Init is called when page is completely loaded

    function updateThickness(evt) {
        thickness = Number(evt.target.value)
        sb.Drawable.update()
    }
    document.querySelector('#dicke').addEventListener('input', updateThickness)
    updateThickness({
        target: document.querySelector('#dicke')
    })

    const wing = new Wing(svg)
    wing.bind('length', '#length')
    wing.bind('width', '#width')
    wing.bind('angle', '#angle')
    
    const wing2 = new Wing()
    wing2.mirrorX(0, 0)
    wing2.bind('length', '#length')
    wing2.bind('width', '#width')
    wing2.bind('angle', '#angle')

    const fuselage = new Fuselage()
    fuselage.bind('length', '#f_length')
    fuselage.bind('height', '#f_height')
    fuselage.bind('stabiliserWidth', '#stab_width')
    
    const stab = new Stabiliser()
    stab.bind('length', '#stab_length')
    stab.bind('width', '#stab_width')
    
    const adapter = new WingAdapter()
    adapter.bind('angle', '#dihedral')
    
    
    function planningLayout() {
        sb.Drawable.popTransformContext()
        sb.Drawable.pushTransformContext()
        wing.translate(160, 0)
        wing2.translate(150, 0)
        fuselage.translate(83, 150)
        stab.translate(150, 100)
        adapter.translate(80, 100)
    }
    
    function presentationLayout() {
        sb.Drawable.popTransformContext()
        sb.Drawable.pushTransformContext()
        wing.translate(160, 30)
        wing2.translate(150, 80)
    }
    
    planningLayout()

    
    
    // Exporting SVG design
    
    document.querySelector('#download').addEventListener('click', evt => {
        const name = document.querySelector('#name').value
        const fileName = `Katapult ${name}.svg`
        const svgString = sb.getSvgString(svg)
        console.log(`Downloading '${fileName}'`)
        download(fileName, svgString)
    })
    
    // Parameter persistence and I/O
    
    const allInputElems = document.querySelectorAll('#controls input')

    document.querySelector('#qrcode').addEventListener('click', evt => {
        const overlay = document.querySelector('#overlay')
        const data = getParamString(allInputElems)
        console.log(`Create QR Code for data: ${data}`)
        makeQRCode(overlay, data)
    })
    
    if (canScan()) {
        const button = document.querySelector('#scan')
        button.style.display = "inline-block"
        button.addEventListener('click', evt => {
            scan(document.querySelector('#video'), str => {
                console.log(`Recognized QR Code data ${str}`)
                setParamsFromString(str, allInputElems)
            })
        })
    }
    
    document.querySelector('#reset').addEventListener('click', evt => {
        const sure = confirm('Hiermit werden alle Änderungen rückgängig gemacht.\nAlles löschen?')
        if (sure) {
            const nohash = window.location.href.split('#')[0]
            window.location.href = nohash
        }
    })


    makeBookmarkable(allInputElems)
    requireLandscape(document.querySelector('#portraitMessage'))
    
}
    
window.addEventListener('load', init)
