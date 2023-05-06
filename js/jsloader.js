export default function loadScript(path) { // no module support for some dependencies :(
    const script = document.createElement('script')
    script.setAttribute('src', path)
    document.head.appendChild(script)
}
