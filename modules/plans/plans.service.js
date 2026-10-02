import { prisma } from "../../lib/prisma"

const getPlans=async (req,res,next)=>{
    const plans=await prisma.plans.findMany({})
    res.status(200).json(plans)
}



export {
    getPlans
}