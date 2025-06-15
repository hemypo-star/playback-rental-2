
export function sendSuccess(res: any, data: any, status = 200) {
  res.status(status).json({ success: true, data });
}

export function sendError(res: any, error: any, status = 400) {
  res.status(status).json({ success: false, error: error.message || error });
}
