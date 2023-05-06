"use strict"

// Import dependencies
import loadScript from './jsloader.js'
loadScript('./js/lib/paper-full.min.js')  // Adds 'paper' to global namespace


export function ensureObj(queryOrObject) {
    if (typeof queryOrObject === 'string' || queryOrObject instanceof String) {
        queryOrObject = document.querySelector(queryOrObject)
    }
    return queryOrObject
}

export function setAttribs(svgObj, attribs) {
    for (const prop in attribs) {
        svgObj.setAttributeNS(null, prop, attribs[prop]);
    }
}

export function resetTransform(svgObj) {
    svgObj = ensureObj(svgObj)
    svgObj.setAttribute('transform', '')
    return svgObj
}

export function appendTransform(svgObj, transformStr) {
    const prevTransform = svgObj.getAttribute('transform') || ''
    svgObj.setAttribute('transform', `${transformStr} ${prevTransform}`)
    return svgObj
}

export function scale(svgObj, scaleX, scaleY, centerX = 0, centerY = 0, inplace = false) {
    // For mirroring, use a scale factor of -1
    svgObj = ensureObj(svgObj)
    if (!inplace) {
        svgObj = svgObj.cloneNode()
    }
    appendTransform(svgObj, `translate(${centerX}, ${centerY}) scale(${scaleX}, ${scaleY}) translate(${-centerX}, ${-centerY})`)
    return svgObj
}

export function rotate(svgObj, angle, centerX = 0, centerY = 0, inplace = false) {
    svgObj = ensureObj(svgObj)
    if (!inplace) {
        svgObj = svgObj.cloneNode()
    }
    appendTransform(svgObj, `translate(${centerX}, ${centerY}) rotate(${angle}) translate(${-centerX}, ${-centerY})`)
    return svgObj
}

export function skew(svgObj, skewX, skewY = 0, inplace = false) {
    svgObj = ensureObj(svgObj)
    if (!inplace) {
        svgObj = svgObj.cloneNode()
    }
    appendTransform(svgObj, `skew(${skewX}, ${skewY})`)
    return svgObj
}

export function translate(svgObj, dx, dy, inplace = false) {
    svgObj = ensureObj(svgObj)
    if (!inplace) {
        svgObj = svgObj.cloneNode()
    }
    appendTransform(svgObj, `translate(${dx}, ${dy})`)
    return svgObj
}

export function mirrorX(svgObj, centerX = 0, centerY = 0, inplace = false) {
    return scale(svgObj, -1, 1, centerX, centerY, inplace)
}

export function mirrorY(svgObj, centerX = 0, centerY = 0, inplace = false) {
    return scale(svgObj, 1, -1, centerX, centerY, inplace)
}

export class PathD {
    // https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths
    constructor(startAtX, startAtY) {
        this.d = ''
        if (startAtX !== undefined && startAtY !== undefined) {
            this.absMove(startAtX, startAtY)
        }
    }

    add(dStr) {
        //console.log(`Adding '${dStr}' to this.d='${this.d}'`)
        this.d += ` ${dStr}`
        return this
    }

    absMove(x, y) { // path segment: move to absolute position
        this.add(`M ${x} ${y}`)
        return this
    }

    move(dx, dy) { // path segment: move to relative position
        this.add(`m ${dx} ${dy}`)
        return this
    }

    halfCircle(dy) { // path segment: half circle to relative position
        this.add(`a ${dy/2} ${dy/2} 0 0 1 0 ${dy}`)
        return this
    }

    line(dx, dy) { // path segment: line to relative position
        this.add(`l ${dx} ${dy}`)
        return this
    }

    hLine(dx) { // path segment: line to relative position at same height
        this.add(`h ${dx}`)
        return this
    }

    vLine(dy) { // path segment: line to relative position in same column
        this.add(`v ${dy}`)
        return this
    }

    close() { // path segment: close path
        this.add(`z`)
        return this
    }

    static _ensurePaperReady() {
        let canvas = document.getElementById('booleanCanvas')
        if (canvas) {
            paper.project.activeLayer.removeChildren()
        } else {
            canvas = document.createElement('canvas')
            canvas.setAttribute('id', 'booleanCanvas')
            canvas.setAttribute('style', 'display:none')
            canvas.setAttribute('resize', 'resize')
            document.body.appendChild(canvas)
            paper.setup(canvas)
        }
    }

    boolean(other, operation) {
        PathD._ensurePaperReady()
        const path1 = new paper.Path(this.toString())
        const path2 = new paper.Path(other.toString())

        const result = path2[operation](path1)

        //exportSVG() doc: http://paperjs.org/reference/item/#exportsvg
        const svgPathElement = result.exportSVG()
        const d = svgPathElement.getAttribute('d')
        return (new PathD()).add(d)
    }

    // Join and keep outline of both paths, discard inner overlap
    union(other) {
            return this.boolean(other, 'unite')
        }
        // Subtract other path from this path
    difference(other) {
            return other.boolean(this, 'subtract')
        }
        // Only keep path around intersecting area
    intersection(other) {
            return this.boolean(other, 'intersect')
        }
        // Only keep path *other* than intersecting area
    exclude(other) {
            return this.boolean(other, 'exclude')
        }
        // Only keep part of this that is enclosed by other
    divide(other) {
        return this.boolean(other, 'divide')
    }

    static fromSvg(svgObj) {
        PathD._ensurePaperReady()
        svgObj = ensureObj(svgObj)
        paper.project.clear()
        paper.project.activeLayer.importSVG(svgObj, {
            expandShapes: true, // expand everything to path items
            insert: true, // draw the path
        })
        const paths = []
        for (const item of paper.project.activeLayer.children) {
            let d = ''
            if (item instanceof paper.Path) {
                d = item.exportSVG().getAttribute('d')
            } else {
                throw Error(`PathD.fromSvg got passed a ${typeof item}: ${item}. Only shapes (paths, circles, rects, ...) are allowed`)
            }
            paths.push(PathD.fromString(d))
            if (paths.length > 1) {
                console.warn(`PathD.fromSvg got more than one object. All but the first object will be ignored`)
            }
        }
        return paths[0]
            //                const name = svgObj.tagName.toLowerCase()
            //                if (name === 'circle') {
            //                    const x = Number(svgObj.getAttribute('cx'))
            //                    const y = Number(svgObj.getAttribute('cy'))
            //                    const r = Number(svgObj.getAttribute('r'))
            //                    const obj = paper.Shape.Circle(
            //                        new paper.Point(x, y),
            //                        r
            //                    )
            //                    const path = obj.toPath(false).exportSVG()
            //                    return PathD.fromString(path.getAttribute('d'))
            //                }
    }

    static fromString(dStr) {
        const p = new PathD()
        p.d = dStr
        return p
    }

    toString() {
        return this.d.trim()
    }
}

export class Drawable {
    static idSeq = 0
    static lastParent = null
    static all = []
    static eventsAllowed = true

    constructor(parent = undefined) {
        this.parent = ensureObj(parent) || Drawable.lastParent
        if (!this.parent) throw new Error('no parent group/svg element')
        Drawable.lastParent = this.parent
        this.id = 'obj' + Drawable.idSeq++
            this.eventListeners = {}
        this.numericProps = []
        Drawable.all.push(this)
    }

    update() {
        throw new Error('update() not implemented')
    }

    static update() {
        Drawable.eventsAllowed = false
        for (const elem of Drawable.all) {
            elem.update()
        }
        Drawable.eventsAllowed = true
    }

    createRootElem(svgElemName, attribs) {
        return this.createElem(svgElemName, attribs, true)
    }

    createElem(svgElemName, attribs, isRoot = false) {
        const elem = document.createElementNS('http://www.w3.org/2000/svg', svgElemName);
        setAttribs(elem, attribs)
        if (isRoot) {
            this.elem = elem
            this.parent.appendChild(this.elem)
        }
        return elem
    }

    makeProp(propName, propValue) {
        const privPropName = `_${propName}`
        this[privPropName] = propValue
        if (Number.isFinite(propValue)) {
            this.numericProps.push(propName)
        }
        Object.defineProperty(this, propName, {
            get() {
                    return this[privPropName]
                },
                set(val) {
                    if (this.numericProps.includes(propName)) {
                        val = Number(val)
                    }
                    this[privPropName] = val
                    if (!Drawable.eventsAllowed) return
                    const listeners = this.eventListeners[propName] || []
                    for (const callback of listeners) {
                        // console.log(`${this}.${propName} changed to ${val}, firing callback ${callback}`)
                        callback()
                    }
                },
        })
    }

    makeTooltip(text) {
        const titleElem = this.createElem('title')
        titleElem.textContent = text
        this.elem.appendChild(titleElem)
        return titleElem
    }

    addCallback(propName, callback) {
        this.eventListeners[propName] = this.eventListeners[propName] || []
        this.eventListeners[propName].push(callback);
    }

    bind(myPropNameOrFunction, controlObj, controlProp = 'value') {
        controlObj = ensureObj(controlObj)
        if (typeof myPropNameOrFunction === 'function' || myPropNameOrFunction instanceof Function) {
            this.bindFunc(myPropNameOrFunction, controlObj, controlProp)
        } else {
            const myPropName = myPropNameOrFunction
            const that = this
            const callback = function (evt) {
                const val = controlProp ? controlObj[controlProp] : controlObj.value
                console.log(`Updating ${that}.${myPropName} to ${val} using ${controlObj}.${controlProp}`)
                that[myPropName] = val
                that.update()
            }
            this.bindFunc(callback, controlObj, controlProp)
        }
    }

    bindFunc(callback, controlObj, controlProp = 'value') {
        controlObj = ensureObj(controlObj)
        if (controlObj instanceof Drawable) {
            controlObj.addCallback(controlProp, callback)
        } else {
            controlObj.addEventListener('input', callback)
        }
        callback()
    }

    toString() {
        return `[${this.constructor.name} ${this.id}]`
    }
}

export class Group extends Drawable {
    constructor(drawablesToContain, attribs, parent = undefined) {
        super(parent)
        this.elems = drawablesToContain
        this.attribs = attribs
        this.createRootElem('g', attribs)
        for (const prop of attribs) {
            this.makeProp(prop, attribs[prop])
        }
    }

    update() {
        for (const prop of this.attribs) {
            this.attrib[prop] = this[prop]
            this.elem.setAttributeNS(null, prop, this.attribs[prop]);
        }
        for (const sub of this.elems) {
            sub.update()
        }
    }
}

export class SvgProxy extends Drawable {
    constructor(queryOrMarkupOrObjs, parent = undefined) {
        if (!queryOrMarkupOrObjs) {
            throw Error(`queryOrMarkupOrObjs must be provided`)
        }
        const isIterable = typeof queryOrMarkupOrObjs[Symbol.iterator] === 'function'
        let objs = isIterable ? queryOrMarkupOrObjs : [queryOrMarkupOrObjs]
        if (typeof queryOrMarkupOrObjs === 'string' || queryOrMarkupOrObjs instanceof String) {
            try {
                objs = document.querySelectorAll(queryOrMarkupOrObjs)
                parent = parent === undefined ? objs.parentNode : parent
            } catch (error) {
                const tempGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                tempGroup.innerHTML = queryOrMarkupOrObjs
                objs = tempGroup.childNodes
                for (const o of objs) {
                    tempGroup.removeChild(o)
                }
            }
        }
        super(parent)
        if (objs.length === 0) {
            throw Error(`Could not interpret queryOrMarkupOrObjs '${queryOrMarkupOrObjs}' as SVG object`)
        }
        if (objs[0].parentNode && objs[0].parentNode !== this.parent) {
            for (const o of objs) {
                objs[0].parentNode.removeChild(o)
                this.parent.appendChild(o)
            }
        } else if (!objs[0].parentNode) {
            for (const o of objs) {
                this.parent.appendChild(o)
            }
        }
        this.elem = objs
    }
}

export function getSvgString(svgElem) {
    PathD._ensurePaperReady()
    paper.project.activeLayer.importSVG(svgElem, {
        insert: true
    })
    return paper.project.activeLayer.exportSVG({
        asString: true
    })
}