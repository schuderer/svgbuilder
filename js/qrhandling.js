"use strict"

// import dependencies
import loadScript from './jsloader.js'
loadScript('./js/lib/qrcode.js')  // Adds 'QRCode' to global namespace
import QrScanner from './lib/qr-scanner.min.js'


// Generate QR Code

function dismissQRCode() {
    _overlay.style.display = 'none'
    _overlay.removeEventListener('click', dismissQRCode)
    document.body.removeEventListener('keyup', dismissQRCode)
}

let _overlay = undefined
export function makeQRCode(overlayElem, data) {
    _overlay = overlayElem
    _overlay.style.display = 'block'
    while (_overlay.firstChild) _overlay.removeChild(_overlay.firstChild)
//    const overlayDim = Math.min(_overlay.offsetWidth, _overlay.offsetHeight, 512)
    const bla = new QRCode(_overlay, {
        text: data,
        useSVG: true,
    })
//    const qrcode = _overlay.querySelector('svg')
//    qrcode.width = overlayDim
//    qrcode.height = overlayDim
    _overlay.addEventListener('click', dismissQRCode)
    document.body.addEventListener('keyup', dismissQRCode)
}


// Scan QR Code

export function canScan() {
    return QrScanner.hasCamera()
}

function cleanupScanner(result) {
//    if (result) console.log('decoded qr code:', result)
    _videoElem.style.display = 'none'
    _videoElem.removeEventListener('click', cleanupScanner)
    document.body.removeEventListener('keyup', cleanupScanner)
    _qrScanner.stop()
    _qrScanner.destroy()
    _qrScanner = undefined
    _stopping = false
}

let _videoElem = undefined
let _qrScanner = undefined
let _stopping = false
export function scan(videoElem, dataCallback) {
    _videoElem = videoElem
    if (!_qrScanner) {
        _qrScanner = new QrScanner(
            _videoElem,
            result => {
                if (_stopping) return
                _stopping = true
                _qrScanner._onDecode = undefined  // hack to avoid double cleanup
                const scanOverlay =_qrScanner.$overlay.firstChild
//                if (scanOverlay._timeout) clearTimeout(scanOverlay._timeout)
                scanOverlay.style.stroke = '#22ee22'
                scanOverlay._timeout = window.setTimeout(_ => {
                    cleanupScanner(result)
                    dataCallback(result.data)
                }, 1500)
            }, {
                maxScansPerSecond: 2,
                highlightScanRegion: true,
                highlightCodeOutline: true,
                returnDetailedScanResult: true,
                onDecodeError: err => {
                    if (_stopping) return
                    console.log(err)
                    // Unnecessary (there are errors all the time)
//                    if (!_qrScanner.$overlay._timeout) {
//                        const scanOverlay =_qrScanner.$overlay.firstChild
//                        const origCol = scanOverlay.style.stroke
//                        scanOverlay.style.stroke = '#ff9203'
//                        if (_stopping) return
//                        scanOverlay._timeout = setTimeout(_ => {
//                            if (_stopping) return
//                            scanOverlay._timeout = undefined
//                            scanOverlay.style.stroke = origCol
//                        }, 250)
//                    }
                }
            },
        )
    }
    _videoElem.style.display = 'block'
    _qrScanner.start()
    _videoElem.addEventListener('click', cleanupScanner)
    document.body.addEventListener('keyup', cleanupScanner)
}
