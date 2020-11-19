const { manage } = require('./index');
let payload, data, event;
// associate itinerary item
// payload = {
//   domain: 'client',
//   action: 'webrtc',
//   command: 'assign',
//   source: 'rw-local',
//   payload: {
//     id: "zl7f3ImElDfwbFJuXcf5",
//     data: {
//       user: 'c4930666-2b78-473c-ad60-f0f8023ee554',
//     }
//   },
//   user: {
//     id: '091e8b52-8506-4512-b75e-149ee51c4f04',
//     username: 'tester',
//     fields: { custom: 'fields' },
//     token: 'e7c070e8d69b28093154bb7c4ca7602af8bd1cd4'
//   },
//   socketId: 'XbTiLsd9CmFwzEafAAAA'
// };
// payload = {
//   domain: 'client',
//   action: 'webrtc',
//   command: 'assign',
//   source: 'rw-local',
//   payload: {
//     id: "zl7f3ImElDfwbFJuXcf5",
//     data: {
//       user: 'a71050de-2405-4094-8116-8a549b3f66f7',
//     }
//   },
//   user: {
//     id: '091e8b52-8506-4512-b75e-149ee51c4f04',
//     username: 'tester',
//     fields: { custom: 'fields' },
//     token: 'e7c070e8d69b28093154bb7c4ca7602af8bd1cd4'
//   },
//   socketId: 'XbTiLsd9CmFwzEafAAAA'
// };

payload = {
  domain: 'client',
  action: 'webrtc',
  command: 'start',
  source: 'rw-local',
  payload: {
    id: "zl7f3ImElDfwbFJuXcf5",
    data: {
      user: 'a71050de-2405-4094-8116-8a549b3f66f7',
    }
  },
  user: {
    id: '091e8b52-8506-4512-b75e-149ee51c4f04',
    username: 'tester',
    fields: { custom: 'fields' },
    token: 'e7c070e8d69b28093154bb7c4ca7602af8bd1cd4'
  },
  socketId: 'XbTiLsd9CmFwzEafAAAA'
};
data = Buffer.from(JSON.stringify(payload)).toString('base64');
event = {
  data
};
manage(event, '', (resp) => {
  console.log(resp);
  console.log('executed');
  process.exit();
});