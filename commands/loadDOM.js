import Cdp from 'chrome-remote-interface'
import sleep from '../utils/sleep'
import parseUrl from 'url'

export default async function loadDOM (url, userAgent) {
  const LOAD_TIMEOUT = process.env.PAGE_LOAD_TIMEOUT || 1000 * 60

  let result
  let loaded = false

  const loading = async (startTime = Date.now()) => {
    if (!loaded && Date.now() - startTime < LOAD_TIMEOUT) {
      await sleep(100)
      await loading(startTime)
    }
  }

  const [tab] = await Cdp.List()
  const client = await Cdp({ host: '127.0.0.1', target: tab })

  const {
    Network, Page, Runtime,
  } = client

  // catch request
  Network.requestIntercepted(({interceptionId, request}) => {
    // perform a test against the intercepted request
    let blocked = false
    const {pathname} = parseUrl.parse(request.url);

    if (pathname.match(/\.(css|png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf|otf)$/)) {
        blocked = true;
    }

    Network.continueInterceptedRequest({
        interceptionId,
        errorReason: blocked ? 'Aborted' : undefined
    });
  });

  Page.loadEventFired(() => {
    loaded = true
  })

  try {
    await Promise.all([Network.enable(), Page.enable()])

    // set user agent
    await Network.setUserAgentOverride({
      userAgent: userAgent,
    })

    await Network.setRequestInterception({patterns: [{ urlPattern: '*' }]});

    await Page.navigate({ url })
    await Page.loadEventFired()
    await loading()

    // get generated dom
    const dom = await Runtime.evaluate({
      expression: 'document.documentElement.outerHTML'
    });
    const html = dom.result.value;

    result = JSON.stringify({
      data: html,
    })
  } catch (error) {
    console.error(error)
  }

  await client.close()

  return result
}
