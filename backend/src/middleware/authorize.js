const { getPermissionsForRole } = require('../constants/rbac')
const { forbidden } = require('../utils/http')

function authorize(permissionName) {
  return (req, _res, next) => {
    const role = req.user?.role
    const permissions = getPermissionsForRole(role)

    if (!permissions[permissionName]) {
      return next(forbidden('This role cannot perform the requested action.'))
    }

    return next()
  }
}

function authorizeAny(permissionNames) {
  return (req, _res, next) => {
    const role = req.user?.role
    const permissions = getPermissionsForRole(role)
    const allowed = permissionNames.some((permissionName) => permissions[permissionName])

    if (!allowed) {
      return next(forbidden('This role cannot perform the requested action.'))
    }

    return next()
  }
}

module.exports = { authorize, authorizeAny }
