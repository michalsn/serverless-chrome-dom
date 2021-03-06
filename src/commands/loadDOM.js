import launchChrome from '@serverless-chrome/lambda'
import Cdp from 'chrome-remote-interface'
import sleep from '../utils/sleep'

export default async function loadDOM (request) {
  const LOAD_TIMEOUT = process.env.PAGE_LOAD_TIMEOUT || 1000 * 60

  const loading = async (startTime = Date.now()) => {
    if (!loaded && Date.now() - startTime < LOAD_TIMEOUT) {
      await sleep(100)
      await loading(startTime)
    }
  }

  // result
  let json = {}
  let loaded = false

  // page flow (Documents)
  let pageRedirects = { url: [], status: [] }
  let pageIgnoredDocuments = []
  let pageFrameId

  // logging options
  const logBlocked = request.logBlocked || '0'
  let blockedContentLog = []

  // chrome flags
  let chromeFlags = []

  // set proxy if available
  if (request.proxy) {
    chromeFlags.push('--proxy-server='+request.proxy)
  }

   // proxy credentials
  let proxyCredentials;

  if (request.proxyUsername && request.proxyPassword) {
    proxyCredentials = { response: 'ProvideCredentials', username: request.proxyUsername, password: request.proxyPassword }
  }

  // run chrome with custom flags
  const chromeInstance = await launchChrome({
    flags: chromeFlags
  })

  // open tab
  const [tab] = await Cdp.List()
  const client = await Cdp({ host: '127.0.0.1', target: tab })

  const {
    Network, Page, Runtime,
  } = client

  // set request interception url pattern
  await Network.setRequestInterception({ patterns: [{urlPattern: '*'}] });

  // speed up page load by blocking unnecessary domains
  Network.setBlockedURLs({ urls: [
    '*www.facebook.com*','*facebook.net*','*.fbcdn.net*','*www.google-analytics.com*','*www.googletagmanager.com*','*api.mixpanel.com*',
    '*doubleclick.net*','*ads.yahoo.com*', '*adroll.com*','*adf.ly*',
    '*fonts.googleapis.com*','*use.typekit.net*'
  ]})

  // catch request
  Network.requestIntercepted(({interceptionId, request, resourceType, authChallenge}) => {
    // handle blocking requests and proxy auth
    let blockedRequest = false
    let proxyAuth = false

    // block some types of resources
    switch (resourceType) {
      case 'Stylesheet':
      case 'Image':
      case 'Media':
      case 'Font': {
        blockedRequest = true;
        if (logBlocked == '1') {
          blockedContentLog.push(request.url)
        }
        break;
      }
    }

    // check if we must authenticate to the proxy
    if (authChallenge && authChallenge.source == 'Proxy') {
      proxyAuth = true
    }

    // resolve request
    Network.continueInterceptedRequest({
      interceptionId,
      errorReason: blockedRequest ? 'Aborted' : undefined,
      authChallengeResponse: proxyAuth && proxyCredentials ? proxyCredentials : undefined,
    })
  })

  /*Network.responseReceived((params) => {
    const {status, url} = params.response;
    console.log(`${status}: ${url}`);
  });*/

  // spy requests to receive final document (after redirects)
  Network.requestWillBeSent((params) => {
    if (params.type === 'Document') {
      // set main frame id
      if (pageFrameId === undefined) {
        pageFrameId = params.frameId
      }
    }
  })

  // log some info about status code and url
  Network.responseReceived((params) => {
    if (params.type === 'Document') {
      const {url, status} = params.response
      // if we deal with the main pageFrameId log this url and status
      if (pageFrameId == params.frameId) {
        pageRedirects.url.push(url)
        pageRedirects.status.push(status)
      }
    }
  });

  // page loaded
  Page.loadEventFired(() => {
    loaded = true
  })

  try {
    await Promise.all([Network.enable(), Page.enable()])
 
    // disable catche request
    await Network.setCacheDisabled({ cacheDisabled: true })

    // set user agent
    await Network.setUserAgentOverride({
      userAgent: request.userAgent,
    })

    // go to url
    const url = request.url
    await Page.navigate({ url })
    await Page.loadEventFired()
    await loading()

    // get generated dom
    const dom = await Runtime.evaluate({
      expression: 'document.documentElement.outerHTML'
    });

    // get gathered info
    const responseOutput = dom.result.value;
    const responseUrl = pageRedirects.url.pop()
    const responseStatus = pageRedirects.status.pop()

    if (responseStatus != 200) {
      json.status = false
      json.error_code = responseStatus || 404
      json.error_msg = responseOutput
      json.url = responseUrl || url
    } else {
      json.status = true
      json.data = responseOutput
      json.url = responseUrl

      if (logBlocked == '1') {
        json.blockedContentLog = blockedContentLog
      }
    }

  } catch (error) {
    console.error(error)
  }

  await client.close()
  // we can remove "kill" if we don't use this function with different proxies
  // killing chrome gives us addition ~1s for each request
  if (!process.env.IS_LOCAL) {
    await chromeInstance.kill()
  }

  return json
}
