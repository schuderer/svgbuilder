"use strict"


// Deal with preferred device orientation

function portraitCheck(elem) {
    window.setTimeout(_ => {
        let display = "none"
        if (screen.orientation && screen.orientation.type) {
            // Separate if statement because on desktop matchMedia gives false positives
            if (screen.orientation.type.includes('portrait')) {
                display = "block"
            }
        }
        else if (window.matchMedia("(orientation: portrait)").matches) {
            display = "block"
         }
        elem.style.display = display
    }, 200)
}

export function requireLandscape(elem) {
    window.addEventListener("orientationchange", _ => {
        portraitCheck(elem)
    })
    portraitCheck(elem)
}

// Handle parameter serialization

// Optionally registered input elements
let _knownInputElems = []


function getVersion() {
    return window.location.pathname.split('/').pop()
}

export function getParamString(inputElems=_knownInputElems) {
    let data = getVersion() + '~'
    for (const input of inputElems) {
        const val = input.value.replace('~', '-')
        data += `${encodeURIComponent(val)}~`
    }
    return data.slice(0, -1) // remove last separator
}

export function setParamsFromString(paramStr, inputElems=_knownInputElems) {
    const params = paramStr.split("~")
    const requestedVersion = params.shift()
    const currentVersion = getVersion()
    if (requestedVersion !== currentVersion) {
        throw new Error(`Version mismatch: requested ${requestedVersion} does not match current ${currentVersion}`)
    }
    if (params.length !== inputElems.length) {
        throw new Error(`Version mismatch: ${inputElems.length} controls vs. ${params.length} params`)
    }
    console.debug(`Setting parameters from string ${paramStr}`)
    let i = 0
    for (const input of inputElems) {
        const val = decodeURIComponent(params[i])
        input.value = val
        input.dispatchEvent(new Event('input'))
        input.dispatchEvent(new Event('change'))
        i++
    }
}

// Keep URL anchor up-to-date with serialized parameters

export function makeBookmarkable(inputElems, monitorEvent='change') {
    _knownInputElems = inputElems
    
    // Check current hash
    const currHash = window.location.hash
    if (currHash) {
        console.log(`Restoring parameters from URL hash ${currHash}`)
        setParamsFromString(currHash.slice(1)) // remove leading '#'
    }
    
    // Update hash in future
    function callback(evt) {
        const paramStr = getParamString()
        console.log(`Updating URL hash to #${paramStr}`)
        window.location.hash = `#${paramStr}`
    }
    for (const input of _knownInputElems) {
        //console.log(`Adding ${monitorEvent} event to ${input}`)
        input.addEventListener(monitorEvent, callback)
    }
}

// Downloading a file
export function download(filename, text) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}
