import { asynchandler } from '../utils/asynchandler.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { User } from '../models/user.model.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import jwt from 'jsonwebtoken'

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()
    console.log(refreshToken)

    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })

    return { accessToken, refreshToken }
  } catch (error) {
    throw new ApiError(
      500,
      'Something went wrong while generating access and refresh tokens'
    )
  }
}

const registerUser = asynchandler(async (req, res) => {
  //get user data from frontend
  //validation-not empty
  //check if user already exists: username and password
  //check for avatar
  //upload on cloundinary,avatar
  //create user object - create entry in db
  //remove password and refresh token from response
  //check for user creation

  const { fullName, userName, email, password } = req.body
  // console.log(fullName, userName, email, password)
  /*
   if(!fullName || !userName || !email || !password){
      throw new ApiError(400,"All fields are required")
   }
*/
  //other method
  if (
    [fullName, userName, email, password].some(
      (field) =>
        field == null || (typeof field === 'string' && field.trim() === '')
    )
  )
    throw new ApiError(400, 'All fields are required')

  const ExistedUser = await User.findOne({
    $or: [{ email }, { userName }],
  })
  // console.log(ExistedUser)

  if (ExistedUser) throw new ApiError(409, 'User already exists')

  const avatarLocalPath = req.files?.avatar[0]?.path
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path

  // console.log(coverImageLocalPath)
  // let coverImageLocalPath
  // if (
  //   req.files &&
  //   Array.isArray(req.files.coverImage) &&
  //   req.files.coverImage.length > 0
  // )
  //   coverImageLocalPath = req.files.coverImage[0].path

  if (!avatarLocalPath) throw new ApiError(400, 'Please upload avatar')

  const avatar = await uploadOnCloudinary(avatarLocalPath)
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if (!avatar) throw new ApiError(400, 'avatar upload failed')

  const user = await User.create({
    fullName,
    userName: userName.toLowerCase(),
    email,
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || '',
  })

  const createdUser = await User.findById(user._id).select(
    '-password -refreshToken'
  )

  if (!createdUser) throw new ApiError(500, 'User creation failed')

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, 'User created successfully'))
})

const loginUser = asynchandler(async (req, res) => {
  //req.body -> data
  // userName or email
  // find the user
  // password check
  // create access token and refresh token
  // send access token and refresh token in cookie
  // send response

  const { email, password, userName } = req.body
  if (!(userName || email))
    throw new ApiError(400, 'username or email is required')

  const user = await User.findOne({
    $or: [{ email }, { userName }],
  })

  if (!user) throw new ApiError(404, "User doesn't exist")

  const isPasswordValid = await user.comparePassword(password)
  if (!isPasswordValid) throw new ApiError(401, 'Invalid user credentials')

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  )

  const LoggedInUser = await User.findById(user._id).select(
    '-password -refreshToken'
  )

  const options = {
    httpOnly: true,
    secure: true,
  }

  await res
    .status(200)
    .cookie('accessToken', accessToken, options)
    .cookie('refreshToken', refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: LoggedInUser, accessToken, refreshToken },
        'User logged in successfully'
      )
    )
})

const LogoutUser = asynchandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: undefined },
    },
    {
      new: true,
    }
  )

  const options = {
    httpOnly: true,
    secure: true,
  }
  return res
    .status(200)
    .clearCookie('accessToken', options)
    .clearCookie('refreshToken', options)
    .json(new ApiResponse(200, {}, 'User logged out successfully'))
})

const refreshAccessToken = asynchandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
  if (!incomingRefreshToken) throw new ApiError(401, 'Unauthorized request')

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    )

    const user = await User.findById(decodedToken._id)

    if (!user) throw new ApiError(401, 'Ivalid refresh token')

    if (user?.refreshToken !== incomingRefreshToken)
      throw new ApiError(401, 'refresh token used')

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user._id)

    const options = {
      httpOnly: true,
      secure: true,
    }

    res
      .status(200)
      .cookie('accessToken', accessToken, options)
      .cookie('refreshToken', newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, newRefreshToken },
          'Access token refreshed successfully'
        )
      )
  } catch (error) {
    throw new ApiError(401, 'Invalid refresh token')
  }
})

const changeCurrentPassword = asynchandler(async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body
  if (newPassword !== confirmPassword)
    throw new ApiError(400, 'Passwords do not match')
  const user = await User.findById(req.user?._id)
  const isPasswordValid = await user.isPasswordCorrect(oldPassword)
  if (!isPasswordValid) throw new ApiError(401, 'Invalid old password')
  user.password = newPassword
  await user.save({ validateBeforeSave: false })
  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Password changed successfully'))
})

const getCurrentUser = asynchandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, 'User found successfully'))
})

const updateAccountDetails = asynchandler(async (req, res) => {
  const { fullName, userName, email } = req.body

  if (!fullName || !userName || !email)
    throw new ApiError(400, 'All fields are required')

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName, //old es5 syntax was fullName:fullName
        userName,
        email,
      },
    },
    {
      new: true,
    }
  ).select('-password')

  return res
    .status(200)
    .json(new ApiResponse(200, user, 'User details updated successfully'))
})

const updateUserAvatar = asynchandler(async (req, res) => {
  const avatarLocalPath = req.file?.path

  if (!avatarLocalPath) throw new ApiError(400, 'Please upload avatar')

  const avatar = await uploadOnCloudinary(avatarLocalPath)
  if (!avatar.url) throw new ApiError(400, 'avatar upload failed')

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar?.url,
      },
    },
    {
      new: true,
    }
  ).select('-password')

  return res
    .status(200)
    .json(new ApiResponse(200, user, 'User avatar updated successfully'))
})

const updateUserCoverImage = asynchandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path

  if (!coverImageLocalPath) throw new ApiError(400, 'Please upload cover image')

  const coverImage = await uploadOnCloudinary(coverImageLocalPath)
  if (!coverImage.url) throw new ApiError(400, 'cover image upload failed')

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage?.url,
      },
    },
    {
      new: true,
    }
  ).select('-password')

  return res
    .status(200)
    .json(new ApiResponse(200, user, 'User cover image updated successfully'))
})

export {
  registerUser,
  loginUser,
  LogoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
}
