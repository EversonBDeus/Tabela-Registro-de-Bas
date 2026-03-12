const API_BASE = 'https://2qs083zp7j.execute-api.sa-east-1.amazonaws.com/prod/bas'

export default defineEventHandler(async (event) => {
  const method = getMethod(event)

  if (method === 'GET') {
    return await $fetch(API_BASE)
  }

  if (method === 'POST') {
    const body = await readBody(event)

    return await $fetch(API_BASE, {
      method: 'POST',
      body,
    })
  }

  throw createError({
    statusCode: 405,
    statusMessage: 'Method Not Allowed',
  })
})
