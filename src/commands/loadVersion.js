import Cdp from 'chrome-remote-interface'

export default async function version () {
  const version = await Cdp.Version()
  return version.Browser
}