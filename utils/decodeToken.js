import jwt from 'jsonwebtoken'
import { AppError } from './AppError'
function getBearerToken(req) {
    const authorization = req.headers.authorization

    if (!authorization || !authorization.startsWith('Bearer ')) {
        throw new AppError('Authentication token is required', 401)
    }

    return authorization.split(' ')[1]
}

function decodeAccessToken(req) {
    try {
        const token = getBearerToken(req)
        const decodedToken = jwt.verify(token, process.env.access_secret_key)
        return decodedToken
    } catch (error) {
        if (error instanceof AppError) {
            throw error
        }

        throw new AppError('Invalid or expired access token', 401)
    }
}

function decodeRefreshToken(req) {
    try {
        const token = getBearerToken(req)
        const decodedToken = jwt.verify(token, process.env.refresh_secret_key)
        return decodedToken
    } catch (error) {
        if (error instanceof AppError) {
            throw error
        }

        throw new AppError('Invalid or expired refresh token', 401)
    }
}

export {
    decodeAccessToken,
    decodeRefreshToken
}