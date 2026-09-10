export default function handler(req, res) {
  res.status(200).json({
    globalControlKeyExists: !!process.env.GLOBAL_CONTROL_API_KEY,
    mailerLiteKeyExists: !!process.env.MAILERLITE_API_KEY,
    mailerLiteKeyLength: process.env.MAILERLITE_API_KEY ? process.env.MAILERLITE_API_KEY.length : 0,
    allEnvKeys: Object.keys(process.env).filter(key => !key.includes('SECRET') && !key.includes('KEY') && !key.includes('TOKEN'))
  });
}