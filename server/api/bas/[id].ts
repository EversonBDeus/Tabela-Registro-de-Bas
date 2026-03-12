const API_BASE = 'https://2qs083zp7j.execute-api.sa-east-1.amazonaws.com/prod/bas'

export default defineEventHandler(async (event) => {
  const method = getMethod(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID não informado',
    })
  }

  const url = `${API_BASE}/${id}`

  if (method === 'GET') {
    return await $fetch(url)
  }

  if (method === 'PUT') {
    const body = await readBody(event)

    return await $fetch(url, {
      method: 'PUT',
      body,
    })
  }

  if (method === 'DELETE') {
    return await $fetch(url, {
      method: 'DELETE',
    })
  }

  throw createError({
    statusCode: 405,
    statusMessage: 'Method Not Allowed',
  })
})
