import version from '../commands/loadVersion'

export default async function handler (event, context, callback) {

  let responseBody
  let contentType

  const request = event.queryStringParameters || event
  
  if (event.headers) {
    contentType = event.headers['Content-Type'] || ''
  }

  if (!['application/json', 'text/plain'].includes(contentType)) {
    contentType = 'text/plain'
  }

  try {
    responseBody = {version: await version()}

    if (contentType == 'application/json') {
      responseBody = JSON.stringify(responseBody)
    } else {
      responseBody = responseBody.version
    }

  } catch (error) {
    console.error('Error reading Version', error)
    return callback(error)
  }

  return callback(null, {
    statusCode: 200,
    body: responseBody,
    headers: {
      'Content-Type': contentType,
    },
  })
}