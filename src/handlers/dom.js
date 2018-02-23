import dom from '../commands/loadDOM'

export default async function handler (event, context, callback) {

  let responseBody
  let contentType

  const request = event.queryStringParameters || event
  
  if (!request.url) {
    return callback('URL parameter is required')
  }

  if (event.headers) {
    contentType = event.headers['Content-Type'] || ''
  }

  if (!['application/json', 'text/html'].includes(contentType)) {
    contentType = 'text/html'
  }

  request.userAgent = request.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36'

  try {
    responseBody = await dom(request)

    if (contentType == 'application/json') {
      responseBody = JSON.stringify(responseBody)
    } else {
      responseBody = responseBody.data || ''
    }
  } catch (error) {
    console.error('Error reading DOM for', url, error)
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