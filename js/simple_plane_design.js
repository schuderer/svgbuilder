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
    return angle / 180 * Math.PI
}
function toAngle(radians) {
    return radians / Math.PI * 180
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
        this.makeProp('type1', 0)

        this.createRootElem('path', cutProps)
        this.makeTooltip('Tragfläche')
    }

    update() {
        if (this.type1) {
            this.elem.setAttribute('visibility', 'hidden')
            return
        }
        else {
            this.elem.removeAttribute('visibility')
        }
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

class DoubleWing extends sb.Drawable {
    constructor(parent = undefined) {
        super(parent)
        this.makeProp('length', 0)
        this.makeProp('width', 0)
        this.makeProp('angle', 0)
        this.makeProp('type1', 1)

        this.createRootElem('path', cutProps)
        this.makeTooltip('Tragfläche')
    }

    update() {
        if (!this.type1) {
            this.elem.setAttribute('visibility', 'hidden')
            return
        }
        else {
            this.elem.removeAttribute('visibility')
        }
        const sinAngle = Math.sin(this.angle * (2*Math.PI/360))
        const tipWidth = this.width * 0.45
        const baseWidthRest = this.width - tipWidth
        
        const d = new sb.PathD(0, 0)
            .hLine(thickness*2)
            .line(this.length, baseWidthRest + this.length * sinAngle)
            .vLine(tipWidth)
            .line(-this.length, -this.length * sinAngle)
            .hLine(-thickness*2)
            .close()
        const tempWing = this.createElem('path', {
            d: d,
            ...cutProps
        })
        const secondHalf = sb.mirrorX(tempWing, 0, 0, true)
        const completeWing = (this.asPathD(secondHalf)).union(d)
        this.elem.setAttribute('d', completeWing)        
    }
}

class Fuselage extends sb.Drawable {
    constructor(parent = undefined) {
        super(parent)
        this.makeProp('length', 200)
        this.makeProp('height', 50)
        this.makeProp('stabiliserWidth', 20)
        // todo: stabiliserAngle ?
        this.makeProp('wingWidth', 30)
        this.makeProp('type1', 1)

        this.createRootElem('g')
        this.body = this.createElem('path', cutProps)
        this.elem.appendChild(this.body)
        this.weightHole = this.createElem('circle', cutProps)
        this.elem.appendChild(this.weightHole)
        this.wingSlot = this.createElem('rect', cutProps)
        this.elem.appendChild(this.wingSlot)

        this.makeTooltip('Rumpf')
    }

    update() {
        const fourthL = this.length/4
        const noseCone = this.height/6
        
        const firstTailPoint = [fourthL * 3, this.height/3]
        const d = new sb.PathD(0, 0)
            .line(...firstTailPoint)
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
            .add(`t ${-fourthL/2} ${-this.height/3.8}`)  // bottom of nose
            .add(`t ${fourthL/4} ${-this.height/2.5}`)  // top of nose
            .add(`T 0 0`)  // finish cockpit
        
        // Vertical stabiliser
        const stabiliserD = new sb.PathD(fourthL * 3, this.height/3)
            .hLine(-this.stabiliserWidth)
            .line(this.stabiliserWidth/2, -this.height*1.1)
            .hLine(this.stabiliserWidth/2)
            .close()
        const union = d.union(stabiliserD)
        this.body.setAttribute('d', union)
        
        // Optional components:

        // Hole for weights
        const holeRad = Math.min(this.length/20, this.height/4)
        sb.setAttribs(this.weightHole, {
            cx: -this.length/5.5,
            cy: 2.7 * this.height/4,
            r: holeRad
        })
        
        // Slot for wings
        if (this.type1) {
            this.wingSlot.removeAttribute('visibility')
            sb.setAttribs(this.wingSlot, {
                // implicit (0, 0) position, will translate later
                width: this.wingWidth,
                height: thickness
            })
            const backAngleRadians = Math.atan2(...firstTailPoint)
            sb.resetTransform(this.wingSlot)
            sb.rotate(this.wingSlot, -toAngle(backAngleRadians)+90, 0, 0, false)
            sb.translate(this.wingSlot, thickness * 3, thickness * 6, 0, 0, false)
        }
        else {
            this.wingSlot.setAttribute('visibility', 'hidden')
        }
    }
}

class NoseCone extends sb.Drawable {
    constructor(fuselageObj, parent = undefined) {
        super(parent)
        this.fuselageObj = fuselageObj
        this.makeProp('length', 200)
        this.makeProp('height', 50)

        this.createRootElem('path', cutProps)
        this.makeTooltip('Nase (2x lasern)')
        
        // Bindings have to happen last
        this.bind('length', fuselageObj, 'length')
        this.bind('height', fuselageObj, 'height')
    }

    update() {
        const w = this.length/4 * 0.6
        const h = this.height
        const rect = this.createElem('rect', {
            x: -this.length/4,
            y: 0,
            width: w,
            height: h,
            ...cutProps
        })
        
        this.fuselageObj.pushTransformContext()  // stash away current transforms
        this.fuselageObj.resetTransform()        // fuselage at original position (0,0)

        this.fuselageObj.update()  // avoid race condition
        const d = this.intersection(this.fuselageObj.body, rect)
        this.elem.setAttribute('d', d)
    
        this.fuselageObj.popTransformContext()   // restore stashed transforms
        
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
        this.makeProp('type1', 0)

        this.createRootElem('path', cutProps)
        this.makeTooltip('Adapter für Flügelmontage (8x lasern)')
    }

    update() {
        if (this.type1) {
            this.elem.setAttribute('visibility', 'hidden')
            return
        }
        else {
            this.elem.removeAttribute('visibility')
        }
        const d = new sb.PathD(0, -0.2)
            .hLine(this.girth)
            .vLine(this.girth * 4 + 0.2)
            .hLine(-this.girth + thickness/2)
            .vLine(-this.girth * 2.5)
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
    document.querySelector('#thickness').addEventListener('input', updateThickness)
    updateThickness({
        target: document.querySelector('#thickness')
    })

    const wing = new Wing(svg)
    wing.bind('length', '#length')
    wing.bind('width', '#width')
    wing.bind('angle', '#angle')
    wing.bind('type1', '#type1', 'checked')
    
    const wing2 = new Wing()
    wing2.mirrorX(0, 0)
    wing2.bind('length', '#length')
    wing2.bind('width', '#width')
    wing2.bind('angle', '#angle')
    wing2.bind('type1', '#type1', 'checked')

    const doubleWing = new DoubleWing()
    doubleWing.bind('length', '#length')
    doubleWing.bind('width', '#width')
    doubleWing.bind('angle', '#angle')
    doubleWing.bind('type1', '#type1', 'checked')
    
    const fuselage = new Fuselage()
    fuselage.bind('length', '#f_length')
    fuselage.bind('height', '#f_height')
    fuselage.bind('stabiliserWidth', '#stab_width')
    fuselage.bind('wingWidth', '#width')
    fuselage.bind('type1', '#type1', 'checked')

    const stab = new Stabiliser()
    stab.bind('length', '#stab_length')
    stab.bind('width', '#stab_width')
    
    const adapter = new WingAdapter()
    adapter.bind('angle', '#dihedral')
    adapter.bind('girth', '#girth')
    adapter.bind('type1', '#type1', 'checked')

    const nose = new NoseCone(fuselage)
    

    
    function designLayout() {
        sb.Drawable.popTransformContext()
        sb.Drawable.pushTransformContext()
        wing.translate(160, 2)
        wing2.translate(150, 2)
        doubleWing.translate(160, 2)
        
        fuselage.translate(83, 150)
        stab.translate(150, 100)
        adapter.translate(80, 100)
        nose.translate(83, 75)
    }
    
    function presentationLayout() {
        sb.Drawable.popTransformContext()
        sb.Drawable.pushTransformContext()
        // todo
    }
    
    designLayout()

    
    
    // Exporting SVG design
    
    document.querySelector('#download').addEventListener('click', evt => {
        const fileName = 'simple_plane.svg'
//        const name = document.querySelector('#name').value
//        const fileName = `Katapult ${name}.svg`
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
