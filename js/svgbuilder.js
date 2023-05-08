"use strict"

// Import dependencies
import loadScript from './jsloader.js'
loadScript('./js/lib/paper-full.min.js') // Adds 'paper' to global namespace


function _isStr(something) {
    return (typeof something === 'string' || something instanceof String)
}

function _isValidSVGPath(dStr) {
    const regex = /^[\s\r\n]*[Mm]\s*((\s*(-?\d+(\.\d+)?\s*,?\s*){2})|(\s*(-?\d+(\.\d+)?)\s*)){1}((\s*[Ll]\s*(-?\d+(\.\d+)?\s*,?\s*){2}\s*)|(\s*[Hh]\s*(-?\d+(\.\d+)?\s*)\s*)|(\s*[Vv]\s*(-?\d+(\.\d+)?\s*)\s*)|(\s*[Cc]\s*(-?\d+(\.\d+)?\s*,?\s*){6}\s*)|(\s*[Ss]\s*(-?\d+(\.\d+)?\s*,?\s*){4}\s*)|(\s*[Qq]\s*(-?\d+(\.\d+)?\s*,?\s*){4}\s*)|(\s*[Tt]\s*(-?\d+(\.\d+)?\s*,?\s*){2}\s*)|(\s*[Aa]\s*(-?\d+(\.\d+)?\s*,?\s*){7}\s*)|(\s*[Zz]\s*)?)*[\s\r\n]*$/
    return regex.test(dStr);
}

export function ensureObj(queryOrObject) {
    if (_isStr(queryOrObject)) {
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

export function scale(svgObj, scaleX, scaleY, centerX = 0, centerY = 0, makeCopy = true) {
    // For mirroring, use a scale factor of -1
    svgObj = ensureObj(svgObj)
    if (makeCopy) {
        svgObj = svgObj.cloneNode()
    }
    appendTransform(svgObj, `translate(${centerX}, ${centerY}) scale(${scaleX}, ${scaleY}) translate(${-centerX}, ${-centerY})`)
    return svgObj
}

export function rotate(svgObj, angle, centerX = 0, centerY = 0, makeCopy = true) {
    svgObj = ensureObj(svgObj)
    if (makeCopy) {
        svgObj = svgObj.cloneNode()
    }
    appendTransform(svgObj, `translate(${centerX}, ${centerY}) rotate(${angle}) translate(${-centerX}, ${-centerY})`)
    return svgObj
}

export function skew(svgObj, skewX, skewY = 0, makeCopy = true) {
    svgObj = ensureObj(svgObj)
    if (makeCopy) {
        svgObj = svgObj.cloneNode()
    }
    appendTransform(svgObj, `skew(${skewX}, ${skewY})`)
    return svgObj
}

export function translate(svgObj, dx, dy, makeCopy = true) {
    svgObj = ensureObj(svgObj)
    if (makeCopy) {
        svgObj = svgObj.cloneNode()
    }
    appendTransform(svgObj, `translate(${dx}, ${dy})`)
    return svgObj
}

export function mirrorX(svgObj, centerX = 0, centerY = 0, makeCopy = true) {
    return scale(svgObj, -1, 1, centerX, centerY, makeCopy)
}

export function mirrorY(svgObj, centerX = 0, centerY = 0, makeCopy = true) {
    return scale(svgObj, 1, -1, centerX, centerY, makeCopy)
}

export class PathD {
    // https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths
    constructor(startAtX_or_ObjToConstructFrom, startAtY) {
        this.d = ''
        if (startAtX_or_ObjToConstructFrom !== undefined && startAtY !== undefined) {
            this.absMove(startAtX_or_ObjToConstructFrom, startAtY)
        }
        else if (startAtX_or_ObjToConstructFrom !== undefined && startAtY == undefined) {
            this.d = PathD.getDStrFromAny(startAtX_or_ObjToConstructFrom)
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
    
    static getDStrFromSvg(svgObj) {
        PathD._ensurePaperReady()
        svgObj = ensureObj(svgObj)
        paper.project.clear()
        paper.project.activeLayer.importSVG(svgObj, {
            expandShapes: true, // expand everything to path items
            insert: true, // draw the path
        })
        const dStrings = []
        for (const item of paper.project.activeLayer.children) {
            let d = ''
            if (item instanceof paper.Path || item instanceof paper.CompoundPath) {
                d = item.exportSVG().getAttribute('d')
            } else {
                throw Error(`PathD.fromSvg got passed a(n) ${typeof item}: ${item}. Only shapes (paths, circles, rects, ...) are allowed`)
            }
            dStrings.push(d)
            if (dStrings.length > 1) {
                console.warn(`PathD.fromSvg got more than one object. All but the first object will be ignored`)
            }
        }
        return dStrings[0]
}

    static fromSvg(svgObj) {
        return PathD.fromString(PathD.getDStrFromSvg(svgObj))
    }

    static fromString(dStr) {
        const p = new PathD()
        p.d = dStr
        return p
    }
    
    static getDStrFromAny(something) {
        // Already a PathD?
        if (something instanceof PathD) {
            console.debug(`PathD.getDStrFromAny() got a PathD (${something})`)
            return something.d
        }
        // paper.js Path object?
        if (something instanceof paper.Path) {
            console.debug(`PathD.getDStrFromAny() got a paper.Path (${something})`)
            return something.exportSVG().getAttribute('d')
        }
        // SVG path? -- NO! This ignores transformations and surprises the user
//        if (something.tagName === 'path' && something.hasAttribute('d')) {
//            console.debug(`PathD.getDStrFromAny() got an SVG path (${something})`)
//            return something.getAttribute('d')
//        }
        // Drawable? Try its root element
        if (something instanceof Drawable) {
            console.debug(`PathD.getDStrFromAny() got a Drawable (${something})`)
            return PathD.getDStrFromSvg(something.elem)
        }
        // Other SVG object?
        try {
            const d = PathD.getDStrFromSvg(something)
            console.debug(`PathD.getDStrFromAny() got an SVG object (${something})`)
            return d
        }
        catch (e) {
            if (e instanceof DOMException) {
                // Not an SVG element
                // try whether something is a valid d string
                if (_isValidSVGPath(something)) {                  
                    console.debug(`PathD.getDStrFromAny() got a d string (${something})`)
                    return something
                }
                else {
                    throw Error(`PathD.fromAny() could not interpret object: ${something}.`)
                }
            }
            else {
                // Something else went wrong
                throw e
            }
        }    }
    
    static fromAny(something) {
        return PathD.fromString(PathD.getDStrFromAny(something))
    }

    toString() {
        return this.d.trim()
    }
    
    elem() {
        const e = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        e.setAttribute('d', this.d)
        return e
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
                console.debug(`Updating ${that}.${myPropName} to ${val} using ${controlObj}.${controlProp}`)
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

    // Join and keep outline of both paths, discard inner overlap
    union(a, b = undefined) {
        if (!b) { b = a; a = this }
        return PathD(a).boolean(PathD(b), 'unite')
    }
    // Subtract other path from this path
    difference(a, b = undefined) {
        if (!b) { b = a; a = this }
        // Reversed for more intuitive "a - b":
        return PathD(b).boolean(PathD(a), 'subtract')
    }
    // Only keep path around intersecting area
    intersection(a, b = undefined) {
        if (!b) { b = a; a = this }
        return PathD(a).boolean(PathD(b), 'intersect')
    }
    // Only keep path *other* than intersecting area
    exclude(a, b = undefined) {
        if (!b) { b = a; a = this }
        return PathD(a).boolean(PathD(b), 'exclude')
    }
    // Only keep part of this that is enclosed by other
    divide(a, b = undefined) {
        if (!b) { b = a; a = this }
        return PathD(a).boolean(PathD(b), 'divide')
    }

    newPathD(...args) {
        return new PathD(...args)
    }

    toString() {
        return `[${this.constructor.name} ${this.id}]`
    }
}
// Make a couple helper functions also methods of Drawable.
// No, I don't like this solution either, but I don't like repeating myself more.
for (const method of[setAttribs, resetTransform, appendTransform, scale, rotate, skew, translate, mirrorX, mirrorY]) {
    Drawable.prototype[method.name] = function (...args) {
        // forcing makeCopy=false for method
        if (args.length > 0 && typeof args[args.length-1] === 'boolean') {
            args[args.length-1] = false
        }
        else {
            args.push(false)
        }
        return method(this.elem, ...args)
    }
}
for (const method of[scale, rotate, skew, translate, mirrorX, mirrorY]) {
    Drawable.prototype[`${method.name}Copy`] = function (...args) {
        // forcing makeCopy=true for method
        if (args.length > 0 && typeof args[args.length-1] === 'boolean') {
            args[args.length-1] = true
        }
        else {
            args.push(true)
        }
        //console.log(`${method.name}Copy(${this.elem}, ${args})`)
        return method(this.elem, ...args)
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

// Export SVG markup string (units in mm)
export function getSvgString(svgElem) {
    PathD._ensurePaperReady()
    paper.project.activeLayer.importSVG(svgElem, {
        insert: true
    })
    return paper.project.activeLayer.exportSVG({
        asString: true
    })
}