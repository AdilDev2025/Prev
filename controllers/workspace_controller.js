//workspace API
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()


const createWorkspace = async (req, res) => {

    const {name} = req.body;

    const checkWorkspace = await prisma.workspace.findUnique(
        {
            where: {name}
        }
    )

    if(checkWorkspace) return res.status(400).json({message: "Workspace already exists"})
    console.log(checkWorkspace)
    const newWorkspace = await prisma.workspace.create(
        {
            data: {name}
        }
    )
    res.status(201).json(newWorkspace, "Workspace created successfully")
}

const getWorkspaces = async (req, res) => {
    const workspaces = await prisma.workspace.findMany()
    res.status(200).json(workspaces)
}


const updateWorkspace = async (req, res) => {

    const id = parseInt(req.params.id);
    const editWorkspace = await prisma.workspace.update(
        {
            where: {id},
            data : req.body
        }
    )

    if(!editWorkspace) return res.status(404).json({message: "Workspace not found"})
    res.status(200).json(editWorkspace, "Workspace updated successfully")
}

const deleteWorkspace = async (req, res) => {

    const id = parseInt(req.params.id);
    const deleteWorkspace = await prisma.workspace.delete(
        {
            where : {id}
        }
    )
    if(!deleteWorkspace) return res.status(404).json({message: "Workspace not found"})
    res.status(200).json(deleteWorkspace, "Workspace deleted successfully")
}

module.exports = {createWorkspace, getWorkspaces, updateWorkspace, deleteWorkspace}