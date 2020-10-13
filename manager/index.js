const Firestore = require('@google-cloud/firestore');
const admin = require('firebase-admin');
const projectId = 'stoked-reality-284921';

const publish = (
  topicName,
  source,
  data
) => {
  const {PubSub} = require('@google-cloud/pubsub');
  // Instantiates a client
  const pubsub = new PubSub({projectId});

  async function publishMessage() {
    const sourceStr = data ? `-${source}` : '';
    const dataBuffer = Buffer.from(JSON.stringify(!data ? source : data));
    console.log('pushing to', `${topicName}${sourceStr}`);
    const messageId = await pubsub.topic(`${topicName}${sourceStr}`).publish(dataBuffer);
    return messageId;
  }

  return publishMessage();
};

/**
 * Triggered from a message on a Cloud Pub/Sub topic.
 *
 * @param {!Object} event Event payload.
 * @param {!Object} context Metadata for the event.
 */
exports.manage = async (event, context, callback) => {
  const message = event && event.data ? JSON.parse(Buffer.from(event.data, 'base64').toString()) : null;
  if (message === null) {
    callback();
  }
  const {domain, action, command, socketId, payload, user, source} = message;
  const db = new Firestore({
    projectId,
  });
  if (message.payload.start_date) {
    message.payload.start_date = Firestore.Timestamp.fromDate(new Date(Date.parse(message.payload.start_date)));
  }
  if (message.payload.end_date) {
    message.payload.end_date = Firestore.Timestamp.fromDate(new Date(Date.parse(message.payload.end_date)));
  }
  switch (command) {
    case 'create':
      try {
        const docRef = db.collection('sessions').doc();
    
        await docRef.set({
          ...payload,
          addedBy: user.id,
          addedAt: Firestore.FieldValue.serverTimestamp()
        });
   
        await Promise.all([
          publish('ex-manage', { domain, action, command, payload: { ...payload, id: docRef.id }, user, socketId }),
          publish('ex-gateway', source, { domain, action, command, payload: { ...payload, id: docRef.id }, user, socketId })
        ]);
        callback();
      } catch (error) {
        await publish('ex-gateway', source, { error: error.message, domain, action, command, payload, user, socketId });
        callback(0);
      }
      break;
    case 'update':
      try {
        const docRef = db.collection('sessions').doc(payload.id);
    
        await docRef.set({
          ...payload,
          updatedBy: user.id,
          updatedAt: Firestore.FieldValue.serverTimestamp()
        }, {
          merge: true
        });
    
        await publish('ex-gateway', source, { domain, action, command, payload: { ...payload }, user, socketId });
        callback();
      } catch (error) {
        await publish('ex-gateway', source, { error: error.message, domain, action, command, payload, user, socketId });
        callback(0);
      }
      break;
    case 'read':
      try {
        const docRef = db.collection('sessions').doc(payload.id);
    
        const session = await docRef.get();

        if (!session.exists) {
          throw new Error('item not found');
        }
    
        await publish('ex-gateway', source, { domain, action, command, payload: { ...payload, ...session.data() }, user, socketId });
        callback();
      } catch (error) {
        await publish('ex-gateway', source, { error: error.message, domain, action, command, payload, user, socketId });
        callback(0);
      }
      break;
    case 'get':
      try {
        const docRef = db.collection('sessions').doc(payload.id);
        const session = await docRef.get();

        if (!session.exists) {
          throw new Error('item not found');
        }

        let data = session.data();

        if (domain === 'client') {
          // we need to get all the instances and their statuses if we are an operator we can get all attendees
          const instancesRef = docRef.collection('instances');
          const instances = await instancesRef.get();
          if (data.configuration.mode && data.configuration.mode === 'group') {
            // should only be 1 instance \\
            const instancesRef = docRef.collection('instances');
            const instances = await instancesRef.get();
            if (instances.size > 0) {
              data.instance = { id: instances.docs[0].id, ...instances.docs[0].data() };
            }
          } else {
            data.instances = {};
            instances.forEach(async instance => {
              data.instances[instance.id] = instance.data();
            });
          }
        } else {
          if (data.configuration.mode) {
            // we need an instance ID
            if (data.configuration.mode === 'group') {
              // should only be 1 instance \\
              const instancesRef = docRef.collection('instances');
              const instances = await instancesRef.get();
              if (instances.size > 0) {
                data.instance = { id: instances.docs[0].id, ...instances.docs[0].data() };
              }
            } else if (!payload.data.instance) {
              throw new Error('instance is required');
            } else {
              const instanceRef = docRef.collection('instances').doc(payload.data.instance);
              const instance = await instanceRef.get();
              if (!instance.exists) {
                throw new Error('instance not found');
              }
              data.instance = { ...instance.data(), id: payload.data.instance };
              console.log('instance retrieved', payload.data.instance, data);
            }
          }
        }
    
        await publish('ex-gateway', source, { domain, action, command, payload: { id: payload.id, ...data }, user, socketId });
        callback();
      } catch (error) {
        console.log(error);
        await publish('ex-gateway', source, { error: error.message, domain, action, command, payload, user, socketId });
        callback(0);
      }
      break;
    case 'start':
      try {
        console.log('payload', payload);
        const docRef = db.collection('sessions').doc(payload.id);
        const session = await docRef.get();

        if (!session.exists) {
          throw new Error('item not found');
        }

        let data = session.data();
        const instancesRef = docRef.collection('instances');
        const instances = await instancesRef.get();
        // if an instance already exists, and this is a group mode, use it as the instance id
        if (instances.size > 0 && data.configuration.mode && data.configuration.mode === 'group') {
          payload.data.instance = instances.docs[0].id;
          // throw new Error('instance_exists');
        }

        const instanceRef = docRef.collection('instances').doc(payload.data.instance);

        payload.data.mode = data.configuration.mode;

        if (data.configuration.mode === 'round-robin') {
          payload.data.operators = data.configuration.operators;
          await instanceRef.set({
            ...payload,
            participants: [user],
            status: 'pending',
            addedBy: user.id,
            addedAt: Firestore.FieldValue.serverTimestamp(),
          });
        } else if (data.configuration.mode === 'instant' && payload.data.participants) {
          await instanceRef.set({
            ...payload,
            participants: payload.data.participants,
            status: 'pending',
            addedBy: user.id,
            addedAt: Firestore.FieldValue.serverTimestamp(),
          });
        } else if (data.configuration.mode === 'instant' && !payload.data.participants) {
          throw new Error('participants required');
        } else if (data.configuration.mode === 'group') {
          await instanceRef.set({
            status: 'active',
            participants: [user],
            addedBy: user.id,
            addedAt: Firestore.FieldValue.serverTimestamp(),
          });
        }
        await publish('ex-gateway', source, { domain, action, command, payload: { ...payload }, user, socketId });
        callback();
      } catch (error) {
        await publish('ex-gateway', source, { error: error.message, domain, action, command, payload, user, socketId });
        callback(0);
      }
      break;
    case 'callback':
      try {
        if (!payload.id) {
          throw new Error('item id is required');
        }
        console.log('payload', payload);
        const docRef = db.collection('sessions').doc(payload.id);
        const session = await docRef.get();

        if (!session.exists) {
          throw new Error('item not found');
        }
        let data = session.data();
        if (data.configuration.mode === 'round-robin') {
          if (domain === 'client') {
            // get all the webrtc instances in the item with status of callback
            // we need to get all the instances with a status of callback if we are an operator we can get all attendees
            const instancesRef = docRef.collection('instances');
            const instances = await instancesRef.where('status', '==', 'callback').get();
            data.instances = {};
            instances.forEach(async instance => {
              data.instances[instance.id] = instance.data();
            });
            payload.data = {
              mode: data.configuration.mode,
              operators: data.configuration.operators,
              instances: data.instances,
              requester: data.requester,
            };
          } else if (domain === 'consumer') {
            const instanceRef = docRef.collection('instances').doc(payload.data.id);
            const instance = await instanceRef.get();
            if (!instance.exists) {
              throw new Error('instance not found');
            }
            instanceRef.set({
              status: payload.data.status,
              requester: user,
              updatedBy: user.id,
              updatedAt: Firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            payload.data = {
              mode: data.configuration.mode,
              operators: data.configuration.operators,
              requester: user,
            };
            payload.data.instances[instance.id] = instance.data();
          }
        } else {
          throw new Error('item not round-robin');
        }
        await publish('ex-gateway', source, { domain, action, command, payload, user, socketId });
        callback();
      } catch (error) {
        await publish('ex-gateway', source, { error: error.message, domain, action, command, payload, user, socketId });
        callback(0);
      }
      break;
    case 'assign':
      try {
        if (domain !== 'client') {
          callback(0);
          return;
        }
        if (!payload.id) {
          throw new Error('item id is required');
        }
        console.log('payload', payload);
        const docRef = db.collection('sessions').doc(payload.id);
        const session = await docRef.get();

        if (!session.exists) {
          throw new Error('item not found');
        }

        let data = session.data();
        if (data.configuration.mode === 'round-robin') {
          await docRef.set({
            configuration: {
              operators: admin.firestore.FieldValue.arrayUnion(payload.data.user),
            },
            updatedBy: user.id,
            updatedAt: Firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
        } else {
          throw new Error('item not round-robin');
        }
        await publish('ex-gateway', source, { domain, action, command, payload, user, socketId });
        callback();
      } catch (error) {
        await publish('ex-gateway', source, { error: error.message, domain, action, command, payload, user, socketId });
        callback(0);
      }
      break;
    case 'activate':
      // client activates and sets status to active
      try {
        if (domain !== 'client') {
          callback(0);
          return;
        }
        if (payload.data.instance) {
          const docRef = db.collection('sessions').doc(payload.id);
          const session = await docRef.get();

          if (!session.exists) {
            throw new Error('item not found');
          }

          let data = session.data();

          payload.data.operators = data.configuration.operators;
          const instanceRef = docRef.collection('instances').doc(payload.data.instance);
          const curInstance = await instanceRef.get();
          if (!curInstance.exists) {
            throw new Error('instance not found');
          }
          const curData = curInstance.data();
          if (curData.participants.length >= data.configuration.max_participants) {
            await instanceRef.set({
              status: 'capacity_reached',
              updatedBy: user.id,
              updatedAt: Firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
          } else {
            await instanceRef.set({
              status: 'active',
              participants: admin.firestore.FieldValue.arrayUnion(user),
              updatedBy: user.id,
              updatedAt: Firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
          }
          const instance = await instanceRef.get();
          payload.data.instance = { ...instance.data(), id: instance.id };
          payload.data.id = instance.id;
        } else {
          throw new Error('instance is required');
        }
        await publish('ex-gateway', source, { domain, action, command, payload: { ...payload }, user, socketId });
        callback();
      } catch (err) {
        await publish('ex-gateway', source, { error: error.message, domain, action, command, payload, user, socketId });
        callback(0);
      }
      break;
    case 'accept':
      try {
        if (domain !== 'consumer') {
          callback(0);
          return;
        }
        if (payload.data.instance) {
          const docRef = db.collection('sessions').doc(payload.id);
          const session = await docRef.get();

          if (!session.exists) {
            throw new Error('item not found');
          }

          let data = session.data();

          payload.data.operators = data.configuration.operators;
          payload.data.mode = data.configuration.mode;
          const instanceRef = docRef.collection('instances').doc(payload.data.instance);
          const curInstance = await instanceRef.get();
          if (!curInstance.exists) {
            throw new Error('instance not found');
          }
          const curData = curInstance.data();
          if (curData.participants && curData.participants.length >= data.configuration.max_participants) {
            await instanceRef.set({
              status: 'capacity_reached',
              updatedBy: user.id,
              updatedAt: Firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
          } else {
            await instanceRef.set({
              status: 'active',
              participants: admin.firestore.FieldValue.arrayUnion(user),
              updatedBy: user.id,
              updatedAt: Firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
          }
          const instance = await instanceRef.get();
          const instanceId = payload.data.instance;
          payload.data.instance = { ...instance.data(), id: instanceId };
          payload.data.id = instance.id;
        } else {
          throw new Error('instance is required');
        }
        await publish('ex-gateway', source, { domain, action, command, payload: { ...payload }, user, socketId });
        callback();
      } catch (err) {
        await publish('ex-gateway', source, { error: err.message, domain, action, command, payload, user, socketId });
        callback(0);
      }
      break;
    case 'leave':
      try {
        if (domain !== 'consumer') {
          callback(0);
          return;
        }
        if (payload.data.instance) {
          const docRef = db.collection('sessions').doc(payload.id);
          const session = await docRef.get();

          if (!session.exists) {
            throw new Error('item not found');
          }

          let data = session.data();

          payload.data.operators = data.configuration.operators;
          const instanceRef = docRef.collection('instances').doc(payload.data.instance);
          const curInstance = await instanceRef.get();
          if (!curInstance.exists) {
            throw new Error('instance not found');
          }
          await instanceRef.set({
            participants: admin.firestore.FieldValue.arrayRemove(user),
            updatedBy: user.id,
            updatedAt: Firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
          const instance = await instanceRef.get();
          payload.data.instance = { ...instance.data(), id: instance.id };
          payload.data.id = instance.id;
        } else {
          throw new Error('instance is required');
        }
        await publish('ex-gateway', source, { domain, action, command, payload: { ...payload }, user, socketId });
        callback();
      } catch (err) {
        await publish('ex-gateway', source, { error: err.message, domain, action, command, payload, user, socketId });
        callback(0);
      }
      break;
    case 'end':
      // client activates and sets status to active
      try {
        if (domain !== 'consumer') {
          callback(0);
          return;
        }
        if (payload.data.instance) {
          const docRef = db.collection('sessions').doc(payload.id);
          const session = await docRef.get();

          if (!session.exists) {
            throw new Error('item not found');
          }

          let data = session.data();

          const instanceRef = docRef.collection('instances').doc(payload.data.instance);
          const curInstance = await instanceRef.get();
          if (!curInstance.exists) {
            throw new Error('instance not found');
          }

          await instanceRef.set({
            status: 'complete',
            // participants: [],
            updatedBy: user.id,
            updatedAt: Firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
          const instance = await instanceRef.get();
          payload.data.instance = { ...instance.data(), id: instance.id };
          payload.data.id = instance.id;
          if (data.configuration && data.configuration.mode) {
            payload.data.mode = data.configuration.mode;
          }
          if (data.configuration && data.configuration.operators) {
            payload.data.operators = data.configuration.operators;
          }
        } else {
          throw new Error('instance is required');
        }
        await publish('ex-gateway', source, { domain, action, command, payload: { ...payload }, user, socketId });
        callback();
      } catch (err) {
        await publish('ex-gateway', source, { error: err.message, domain, action, command, payload, user, socketId });
        callback(0);
      }
      break;
    case 'sign':
      if (action === 'zoom') {
        const apiKey = 'iy8bpRGDEjKzDXYt5sx3KxGBtALmxiSdk7yY';
        const apiSecret = 'Vdzh9PEWAszheUQvlaIi2K1g9eXhKwsdJgKj';
        // Prevent time sync issue between client signature generation and zoom 
        const timestamp = new Date().getTime() - 30000;
        const msg = Buffer.from(apiKey + payload.meetingNumber + timestamp + payload.role).toString('base64');
        const hash = crypto.createHmac('sha256', apiSecret).update(msg).digest('base64');
        const signature = Buffer.from(`${apiKey}.${payload.meetingNumber}.${timestamp}.${payload.role}.${hash}`).toString('base64');

        await publish('ex-gateway', source, { domain, action, command, payload: { signature }, user, socketId });
      }
      break;
  }
  return;
};