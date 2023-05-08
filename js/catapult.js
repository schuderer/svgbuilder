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
const units = 'mm'


// Describe your model and UI here

let thickness = 3;

const cutProps = {
    stroke: 'black',
    'stroke-width': 0.5,
    fill: 'transparent',
}
const engraveProps = {
    stroke: 'green',
    'stroke-width': 0.5,
    fill: 'transparent',
}

class Bar extends sb.Drawable {
    constructor(x, y, width, height, parent = undefined) {
        super(parent)
        this.makeProp('x', x)
        this.makeProp('y', y)
        this.makeProp('w', width)
        this.makeProp('h', height)
        this.makeProp('holeWidth', thickness * 1.8)
        this.makeProp('holeHeight', thickness)
        this.createRootElem('g', {
            id: this.id
        })
        this.outline = this.createElem('path', cutProps)
        this.elem.appendChild(this.outline)

        this.hole1 = this.createElem('rect', this.calcHole(0))
        this.hole2 = this.createElem('rect', this.calcHole(0))
        this.elem.appendChild(this.hole1)
        this.elem.appendChild(this.hole2)

        this.makeTooltip('Querstreben')

        this.update()
    }

    calcHole(dx) {
        return {
            x: this.x + dx,
            y: (this.y + this.h / 2) - this.holeHeight / 2,// - (thickness / 1.5),
            width: this.holeWidth,
            height: this.holeHeight,
            ...cutProps
        }
    }

    withNotch() {
        this.notch = this.createElem('path', cutProps)
        return this
    }

    update() {
        let d = new sb.PathD(this.x, this.y)
            .hLine(this.w)
            .vLine(this.h / 4)
            .hLine(this.holeWidth + 1.5)
            .halfCircle(this.h / 2)
            .hLine(-(this.holeWidth + 1.5))
            .vLine(this.h / 4)
            .hLine(-this.w)
            .vLine(-this.h / 4)
            .hLine(-(this.holeWidth + 1.5))
            .halfCircle(-this.h / 2)
            .hLine(this.holeWidth + 1.5)
            .close()
        this.outline.setAttribute('d', d)

        if (this.notch) {
            // Doing this a bit clumsily to test
            // boolean operations with primitives
            const middle = this.x + this.w / 2
            const depth = this.h * 0.4
            const rect1 = this.createElem('rect', {
                x: middle + 10,
                y: this.y,
                width: 5,
                height: depth
            })
            const rect2 = this.createElem('rect', {
                x: middle + 5,
                y: this.y + depth / 2,
                width: 5 + 2,
                height: depth / 2
            })
            const union = sb.PathD.fromSvg(rect1).union(sb.PathD.fromSvg(rect2))
            this.notch.setAttribute('d', union)

            const notch2 = sb.mirrorX(this.notch, middle, this.y)

            const subtracted = sb.PathD.fromSvg(this.outline).difference(sb.PathD.fromSvg(this.notch))
            const subtracted2 = subtracted.difference(sb.PathD.fromSvg(notch2))
            this.outline.setAttribute('d', subtracted2)
        }

        sb.setAttribs(this.hole1, this.calcHole(-thickness - this.holeWidth + thickness*0.3))
        sb.setAttribs(this.hole2, this.calcHole(this.w + thickness - thickness*0.3))
    }
}

class Arm extends sb.Drawable {
    constructor(x, y, length, width, armWidth, parent = undefined) {
        super(parent)
        this.makeProp('x', x)
        this.makeProp('y', y)
        this.makeProp('l', length)
        this.makeProp('w', width)
        this.makeProp('aw', armWidth)
        this.makeProp('ro', armWidth) // Bucket outer radius
        this.makeProp('ri', armWidth / 2) // Bucket inner radius                
//        this.createRootElem('g', {
//            id: this.id
//        })
        this.outline = this.createRootElem('path', cutProps)
//        this.elem.appendChild(this.outline)
        this.bucket = this.createElem('circle', {
            cx: this.x,
            cy: this.y + this.ro,
            r: this.ro,
            id: `${this.id}bucket`,
            ...cutProps
        })
        this.hole = this.createElem('circle', {
            cx: this.x,
            cy: this.y + this.ro,
            r: this.ri,
            id: `${this.id}hole`,
            ...cutProps
        })
        this.makeTooltip('Wurfarm des Katapults')
    }

    update() {
        const middle = this.x
        const notch = this.aw / 6
        const halfOutline = new sb.PathD(middle, this.y + this.ro)
            .hLine(this.aw / 2)
            .vLine(this.l / 2)
            .add(`a ${notch} ${notch} 0 0 0 ${-notch} ${notch}`)
            .vLine(notch)
            .add(`a ${notch} ${notch} 0 0 0 ${notch} ${notch}`)
            .hLine(notch)
            .add(`a ${notch} ${notch} 0 0 1 ${-notch} ${notch}`)
            .vLine(this.l / 2 - 4 * notch - this.aw / 2)
            .hLine(this.w / 2 - this.aw / 2)
            .vLine(this.aw / 4)
            .hLine(thickness)
            .vLine(this.aw / 2)
            .hLine(-thickness)
            .vLine(this.aw / 4)
            .hLine(-this.w / 2)
            // todo
            .close()

        // todo
        this.outline.setAttribute('d', halfOutline) // to get path svg obj
        const otherHalf = sb.mirrorX(this.outline, middle, this.y)
        const fullOutline = halfOutline.union(sb.PathD.fromSvg(otherHalf))
        const withOuterCircle = fullOutline.union(sb.PathD.fromSvg(this.bucket))
        const withHole = withOuterCircle.difference(sb.PathD.fromSvg(this.hole))

        this.outline.setAttribute('d', withHole)
    }
}

class Side extends sb.Drawable {
    constructor(x, y, length, height, baseHeight, axisOffset, text, flip, parent = undefined) {
        super(parent)
        this.makeProp('x', x)
        this.makeProp('y', y)
        this.makeProp('l', length)
        this.makeProp('h', height)
        this.makeProp('bh', baseHeight)
        this.makeProp('ao', axisOffset)
        this.makeProp('text', text)
        this.makeProp('flip', flip)
        this.createRootElem('g', {
            id: this.id
        })
        this.outline = this.createElem('path', cutProps)
        this.textElem = this.createElem('text', {
            style: `font: bold ${this.bh*0.8}px sans-serif;text-anchor:middle;fill:none;stroke:red;`
        })
        this.elem.appendChild(this.textElem)
        this.elem.appendChild(this.outline)

        if (!this.flip) this.makeTooltip('Seitenteil des Katapults')
        else this.makeTooltip('Zweites Seitenteil des Katapults (umgedreht)')
    }

    update() {
        const lPart = this.l / 7
        const radius = this.bh / 5
        const scaffoldHeight = this.h - this.bh
        let outline = new sb.PathD(this.x, this.y)
            .vLine(-this.bh + radius)
            .add(`a ${radius} ${radius} 0 0 1 ${radius} ${-radius}`)
            .hLine(lPart - radius)
            //                .add(`a ${radius} ${radius} 0 0 0 ${radius} ${-radius/2}`)
            .line(lPart, -scaffoldHeight)
            .hLine(lPart)
            .line(lPart, scaffoldHeight)
            .hLine(3 * lPart - radius)
            .add(`a ${radius} ${radius} 0 0 1 ${radius} ${radius}`)
            .vLine(this.bh - radius)
            // todo
            .hLine(-this.l)

        const that = this

        function makeSlot(dx, dy) {
            return new sb.PathD(that.x + dx, that.y - that.bh / 4 * 3 + dy)
                .hLine(thickness)
                .vLine(that.bh / 2)
                .hLine(-thickness)
                .close()
        }
        const slot = makeSlot(lPart / 4, 0)
        slot.add(makeSlot(4 * lPart, 0))
        slot.add(makeSlot(this.l - lPart / 4 - thickness, 0))
        const xCenter = 2.5 * lPart
        slot.add(makeSlot(xCenter - thickness / 2, -this.h + this.bh))

        outline = outline.add(slot)

        function makeHole(dx) {
            return sb.PathD.fromSvg(that.createElem('circle', {
                cx: that.x + xCenter - thickness + that.ao + dx,
                cy: that.y - that.bh / 2 - thickness / 2, // safety dist from floor
                r: that.bh / 4 + thickness / 6,
                ...cutProps
            }))
        }
        outline = outline.add(makeHole(this.ao))
        outline = outline.add(makeHole(this.ao - that.bh / 2 - 5))
        outline = outline.add(makeHole(this.ao + that.bh / 2 + 5))

        this.outline.setAttribute('d', outline)
//        sb.resetTransform(this.elem)  // both variants are possible for this.elem
        this.resetTransform()
        sb.resetTransform(this.outline)

        this.textElem.innerHTML = this.text
        let textX = this.x + lPart * 2.5

        if (this.flip) {
            textX = this.x + lPart * 4.5
            sb.mirrorX(this.outline, this.x + this.l / 2, this.y, false)
//            sb.rotate(this.elem, 180, this.x + this.l / 2, this.y, false)
//            sb.translate(this.elem, lPart * 2, -this.h - this.bh, false)
            this.rotate(180, this.x + this.l / 2, this.y)
            this.translate(lPart * 2, -this.h - this.bh)
            if (this.text.includes(';')) {  // for fun: different strings per side
                const [t1, t2] = this.text.split(';')
                this.text = t2
                this.update()
                const other = sb.Drawable.all.filter(e => {
                    return e instanceof Side && e.id != this.id
                })
                if (other.length === 1) {
                    other[0].text = t1
                    other[0].update()
                }
            }
        }

        sb.setAttribs(this.textElem, {
            x: textX,
            y: this.y - this.bh - 2
        })
    }
}

class Pins extends sb.Drawable {
    constructor(x, y, length, parent = undefined) {
        super(parent)
        this.makeProp('x', x)
        this.makeProp('y', y)
        this.makeProp('l', length)
//        this.createRootElem('g', {})
        this.path = this.createRootElem('path', cutProps)
//        this.elem.appendChild(this.path)
        this.makeTooltip('Keile zum Zusammenstecken')
    }

    update() {
        const numBlocks = 6 // each block consists of two pins
        const minWidth = thickness
        const maxWidth = thickness * 2
        const path = new sb.PathD(this.x, this.y)
        path.hLine(numBlocks * (maxWidth + minWidth))
            .vLine(this.l)
            .hLine(-numBlocks * (maxWidth + minWidth))
            .close()
        for (let i = 0; i < numBlocks; i++) {
            path.move(minWidth, 0)
                .line(maxWidth - minWidth, this.l)
                .move(minWidth, 0)
                .vLine(-this.l)
        }
        this.path.setAttribute('d', path)
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

    const rippenLaenge = 60
    const rippenHoehe = 20
    const armLaenge = 130
    const katapultLaenge = 250
    const achsenOffset = 0

    const pins = new Pins(20, 10, rippenHoehe, svg)
    pins.update()

    const barNotch = new Bar(20, 10 + rippenHoehe, rippenLaenge, rippenHoehe).withNotch()
    barNotch.bind('w', '#breite')

    for (let i = 2; i < 5; i++) {
        const bar = new Bar(20, 10 + rippenHoehe * i, rippenLaenge, rippenHoehe, svg)
        bar.bind('w', '#breite')
    }

    const arm = new Arm(300, 10, armLaenge, rippenLaenge, rippenHoehe)
    arm.bind('w', '#breite')
    arm.bind('l', '#armLaenge')

    const seite = new Side(10, 330, katapultLaenge, armLaenge / 2 + 1.5 * rippenHoehe, rippenHoehe, achsenOffset, "", false)
    seite.bind('ao', '#achse')
    seite.bind('l', '#laenge')
    seite.bind('text', '#name')
    seite.bind(_ => {
        seite.h = arm.l / 2 + 1.5 * seite.bh
        seite.update()
    }, arm, 'l')

    let seite2 = undefined
    function MachSeite2() {
        if (!seite2) { // Nur 1x erstellen
            seite2 = new Side(10, 330, katapultLaenge, armLaenge / 2 + 1.5 * rippenHoehe, rippenHoehe, achsenOffset, "", true)
            seite2.bind('ao', '#achse')
            seite2.bind('l', '#laenge')
            seite2.bind('text', '#name')
            seite2.bind(_ => {
                seite2.h = arm.l / 2 + 1.5 * seite2.bh
                seite2.update()
            }, arm, 'l')
        }
    }
    
    // Exporting SVG design
    
    document.querySelector('#download').addEventListener('click', evt => {
        MachSeite2()
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

    makeBookmarkable(allInputElems)
    requireLandscape(document.querySelector('#portraitMessage'))
    
    /*
    Some tests for PathD construction from (almost) arbitrary objects:
    // should succeed
    console.log(new sb.PathD(arm))
    console.log(new sb.PathD(new sb.PathD(239, 289)))
    console.log(new sb.PathD(barNotch.elem.firstChild))
    console.log(new sb.PathD("path"))  // DOM query selector
    console.log(new sb.PathD("M 29 29"))
    console.log(new sb.PathD(new paper.Path()))
    // should fail
//    console.log(new sb.PathD("]{}"))
//    console.log(new sb.PathD(42))
//    console.log(new sb.PathD(document.querySelector('input')))
*/
}
    
window.addEventListener('load', init)
