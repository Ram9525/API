class ApiError extends Error {
  constructor(
    statusCode,
    message = 'Something went wrong',
    error = [],
    stack = ''
  ) {
    super(message)
    this.statusCode = statusCode
    this.error = error
    this.stack = stack
    this.data = null
    this.success = false

    if (stack) {
      this.statck = statck
    } else {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

export { ApiError }
 