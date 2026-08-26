// desktop-sync/src/apiClient.js
const axios = require('axios');
const fs = require('fs-extra');
const FormData = require('form-data');
const path = require('path');
const { loadConfig } = require('./config');

class ApiClient {
  constructor() {
    this.refreshClient();
  }

  refreshClient() {
    const config = loadConfig();
    this.serverUrl = config.serverUrl.replace(/\/+$/, '');
    this.token = config.token;
    this.deviceId = config.deviceId;

    this.http = axios.create({
      baseURL: `${this.serverUrl}/api`,
      headers: {
        Authorization: this.token ? `Bearer ${this.token}` : ''
      },
      timeout: 60000
    });
  }

  async login(identifier, password) {
    const res = await axios.post(`${this.serverUrl}/api/auth/login`, { identifier, password });
    this.token = res.data.token;
    this.refreshClient();
    return res.data;
  }

  async getDiff(clientManifest) {
    const res = await this.http.post('/sync/windows/diff', {
      deviceId: this.deviceId,
      clientManifest
    });
    return res.data.data;
  }

  async uploadFile(localFullPath, relativePath, clientHash) {
    const form = new FormData();
    form.append('file', fs.createReadStream(localFullPath));
    form.append('relativePath', relativePath.replace(/\\/g, '/'));
    form.append('clientHash', clientHash);

    const res = await this.http.post('/sync/windows/upload', form, {
      headers: {
        ...form.getHeaders()
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    return res.data.data;
  }

  async downloadFile(fileId, localDestinationPath) {
    await fs.ensureDir(path.dirname(localDestinationPath));
    const response = await this.http.get(`/stream/download/${fileId}`, {
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(localDestinationPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  }
}

module.exports = new ApiClient();
