'use strict'

const Compute = require('@google-cloud/compute');
const {DNS} = require('@google-cloud/dns');
const dns = new DNS();
const process = require('process'); // Required for mocking environment variables

exports.Create = async ({ action, body, date }) => {
  // create a new room with Compute server and Cloud DNS entries
  const ip = await internal.createCompute({ name: body.name });
  return internal.createDNS({ name: body.name, ip });
};

const internal = {
  async createCompute ({ name  }) {
    // create the Compute instance from image
    return '34.89.103.197';
  },
  async createDNS ({ name, ip }) {
    // create DNS record for server
    try {
      const zone = dns.zone(process.env.PARENT_ZONE);
      const domain = await zone.get();
      const record = zone.record('A', {
        name: `${name}.ex-collab.${domain[1].dnsName}`,
        ttl: 3600,
        data: ip
      });
      return await zone.createChange({
        add: record
      });
    } catch (error) {
      console.log(error);
    }
  }
}