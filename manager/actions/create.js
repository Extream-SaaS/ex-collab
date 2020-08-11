'use strict'

const Compute = require('@google-cloud/compute');
const {DNS} = require('@google-cloud/dns');
const dns = new DNS();
const process = require('process'); // Required for mocking environment variables
const { machineTypes } = require('../options');

exports.Create = async ({ action, body, date }) => {
  // create a new room with Compute server and Cloud DNS entries
  try {
    const vm = await internal.createCompute(body);
    await vm.waitFor('RUNNING');
    internal.instance = vm;
    internal.instanceMeta = (await vm.getMetadata())[0];
    const ip = internal.instanceMeta.networkInterfaces[0].accessConfigs[0].natIP;
    await internal.createDNS({ name: body.name, ip });
    console.log('running cloud init');
    internal.cloudInit();
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const internal = {
  instance: null,
  instanceMeta: {},
  instanceDNS: null,
  async createCompute ({ name, size  }) {
    // create the Compute instance from image stored in env
    const compute = new Compute();
    const zone = compute.zone('europe-west2-b');

    const config = {
      machineType: machineTypes[size],
      os: `${process.env.PROJECT_ID}/${process.env.MACHINE_IMAGE}`,
      http: true,
      https: true,
    }
    try {
      const vmCreate = await zone.createVM(name, config);
      const vm = vmCreate[0];
      return vm;
    } catch (error) {
      console.log(error);
      throw error;
    }
  },
  async cloudInit () {
    const internalIP = internal.instanceMeta.networkInterfaces[0].networkIP;
    const externalIP = internal.instanceMeta.networkInterfaces[0].accessConfigs.natIP;
    const external_internalIP_regex = `${externalIP}\\/${internalIP}`;
    const server_name = internal.instanceDNS;
    // TODO: debug EXTERNAL_INTERNAL not being swapped in turnserver
    const setMeta = await internal.instance.setMetadata({
      'startup-script': `#!/bin/bash
      rm -rf /etc/nginx/sites-enabled/default
      rm -rf /etc/nginx/sites-available/default
      sed -i 's/###_EXTERNAL_INTERNAL_###/${external_internalIP_regex}/g' /etc/turnserver.conf
      sed -i 's/###_SERVER_NAME_###/${server_name}/g' /etc/nginx/sites-available/kurento.conf
      sed -i 's/###_INTERNAL_###/${internalIP}/g' /etc/turnserver.conf
      systemctl enable nginx
      systemctl start nginx
      certbot --nginx --noninteractive --agree-tos -m web@extream.app -d ${server_name}
      systemctl restart nginx`
    });
    return internal.instance.reset();
  },
  async createDNS ({ name, ip }) {
    // create DNS record for server
    const zone = dns.zone(process.env.PARENT_ZONE);
    const domain = await zone.get();
    const aRecord = `${name}.ex-collab.${domain[1].dnsName}`;
    internal.instanceDNS = aRecord.slice(0, -1);
    const record = zone.record('A', {
      name: aRecord,
      ttl: 3600,
      data: ip
    });
    return await zone.createChange({
      add: record
    });
  }
}