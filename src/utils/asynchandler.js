const asynchandler = (requestHandler) => {
  return (req, res, next) => {
    Promise
    .resolve(requestHandler(req, res, next))
    .catch((err) => next(err))
  }
}

export { asynchandler }

//another way of writing asynchandler using async/await and try/catch

/*
const asynchandler= (requestHandler)=> async (req, res, next) => {
    try {
        await requestHandler(req, res, next)
    } catch (error) {
        res.status(error.status|| 500).json({error: error.message})
    }
}
*/
