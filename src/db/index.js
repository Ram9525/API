import {connect} from 'mongoose'
import { DB_NAME } from '../constants.js'
// console.log("MONGODB_URI:",process.env.MONGODB_URI);


const connectDB = async () => {
  try {
    const connectionInstance = await connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    )
    console.log(
      `\n Connected to MONGODB!! DB Host: ${connectionInstance.connection.host}`
    )
  } catch (error) {
    console.log(`Failed connecting to MONGODB: ${error.message}`)
    process.exit(1)
    // throw error
  }
}

export default connectDB
