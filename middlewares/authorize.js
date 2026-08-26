import {AppError} from "../utils/appError.js"
import { decodeAccessToken } from "../utils/decodeToken.js"

function authorize(roles){
    return (req,res,next)=>{
        const decodedUser= decodeAccessToken(req)
        const {role}= decodedUser
        if(!roles.includes(role)){
            const error=new AppError('Forbidden',403)
            return next(error)
        }
        req.user=decodedUser
        next()
    }
}
export default authorize