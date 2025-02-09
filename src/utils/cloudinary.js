import {v2 as cloudinary} from 'cloudinary'
import fs from 'fs'

// Configure cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})
// console.log("cloudName in utils/cloudinary.js:",process.env.CLOUDINARY_CLOUD_NAME);




const uploadOnCloudinary = async (localFilePath) => {
     
        try {
            if(!localFilePath) return
            //upload the file on cloudinary
            const response = await cloudinary.uploader.upload(localFilePath,{
                resource_type: 'auto',
            })
            //file has been uploaded successfully
            // console.log("File is uploaded on cloudinary",response.url);
            fs.unlinkSync(localFilePath)
            return response
            
        } catch (error) {
            console.log(error)
            fs.unlinkSync(localFilePath) //remove the locally saved temporary file as the upload operation got failed
            
        }
}

export {uploadOnCloudinary}