const {OAuth2Client} = require('google-auth-library');
const client = new OAuth2Client();

async function googleVerify(token:any) {
  const ticket = await client.verifyIdToken({
      idToken: token,
  });
  const payload = ticket.getPayload();
  return payload
}

export default googleVerify;