import Cdp from 'chrome-remote-interface'
import sleep from '../utils/sleep'

export default async function loadDOM (request) {
  const LOAD_TIMEOUT = process.env.PAGE_LOAD_TIMEOUT || 1000 * 60

  let json = {}
  let loaded = false

  // page flow (Documents)
  let pageRedirects = { url: [], status: [] }
  let pageIgnoredDocuments = []

  // logging options
  const logBlocked = request.logBlocked || '0'
  let blockedContentLog = []

  let proxyCredentials;

  if (request.proxyUsername && request.proxyPassword) {
    proxyCredentials = { response: 'ProvideCredentials', username: request.proxyUsername, password: request.proxyPassword }
  }

  const loading = async (startTime = Date.now()) => {
    if (!loaded && Date.now() - startTime < LOAD_TIMEOUT) {
      await sleep(100)
      await loading(startTime)
    }
  }

  // open tab
  const [tab] = await Cdp.List()
  const client = await Cdp({ host: '127.0.0.1', target: tab })

  const {
    Network, Page, Runtime,
  } = client

  // set request interception url pattern
  await Network.setRequestInterception({ patterns: [{urlPattern: '*'}] });


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
      case "Font": {
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
    });
  });

  // log some info about status code and url
  Network.responseReceived((params) => {
    if (params.type === 'Document') {
      const {url, status} = params.response
      pageRedirects.url.push(url)
      pageRedirects.status.push(status)
    }
  });

  /*Network.responseReceived((params) => {
    const {status, url} = params.response;
    console.log(`${status}: ${url}`);
  });*/

  // spy requests to receive final document (after redirects)
  Network.requestWillBeSent((params) => {
    if (params.initiator !== undefined && params.initiator.url !== undefined && params.documentURL !== undefined &&
      pageRedirects.url.indexOf(params.initiator.url) !== -1 && // if initiator page exist in redirects => it's iframe loads
      pageIgnoredDocuments.indexOf(params.documentURL) === -1
    ) {
      pageIgnoredDocuments.push(params.documentURL)
    }
  })

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

  return json
}
