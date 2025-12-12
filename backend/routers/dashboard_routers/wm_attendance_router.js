const { registerForAttendance , attendance_WM } = require('../../controllers/dashboard/attendance_WM_controller')
const vm_attendance = require('express').Router()
const { protect } = require('../../Middlewares/auth_middleware')

vm_attendance.post('/register',registerForAttendance)
vm_attendance.get('/attendance',attendance_WM)
module.exports = vm_attendance

