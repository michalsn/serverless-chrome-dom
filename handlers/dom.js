import dom from '../commands/loadDOM'

export default async function handler (event, context, callback) {

  let data

  const url = event.queryStringParameters.url || ''
  const userAgent = event.queryStringParameters.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36'

  try {
    data = await dom(url, userAgent, false)
  } catch (error) {
    console.error('Error reading DOM for', url, error)
    return callback(error)
  }

  return callback(null, {
    statusCode: 200,
    body: data,
  })
}