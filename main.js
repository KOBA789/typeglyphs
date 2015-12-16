'use strict';

class SequentialDataView extends DataView {
  constructor(...args) {
    super(...args);
    this.cursor = 0;
  }

  getSubView(offset, length) {
    return new SequentialDataView(this.buffer, this.byteOffset + offset, length);
  }

  readSubView(length) {
    const newDataView = this.getSubView(this.cursor, length);
    this.cursor += newDataView.byteLength;
    return newDataView;
  }
}

for (let origMethodName of Object.getOwnPropertyNames(DataView.prototype)) {
  const matches = origMethodName.match(/^(get|set)([^0-9]+)([0-9]+)$/);
  if (matches === null) { continue; }
  const [_, getset, type, bitSize] = matches;
  const methodName = {get: 'read', set: 'write'}[getset] + type + bitSize;
  const byteLength = ~~(bitSize) / 8;
  Object.defineProperty(SequentialDataView.prototype, methodName, {
    enumerable: false,
    value: function (...args) {
      const v = this[origMethodName](this.cursor, ...args);
      this.cursor += byteLength;
      return v;
    }
  });
}

function fetchArrayBuffer (url) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response);
    xhr.onerror = (err) => reject(err);
    xhr.responseType = 'arraybuffer';
    xhr.open('GET', url, true);
    xhr.send();
  }).then((data) => {
    return data;
  });
}

class CFF {
  constructor(data) {
    this.data = data;
    this.parse();
  }

  readCard8() {
    return this.data.readUint8();
  }

  readCard16() {
    return this.data.readUint16();
  }

  readOffSize() {
    return this.data.readUint8();
  }

  readOffset(size = this.readOffSize()) {
    let v = 0;
    for (let i = 0; i < size; ++i) {
      v = v * 0x100;
      v += this.data.readUint8();
    }
    return v;
  }

  readINDEX(klass = INDEX) {
    const count = this.readCard16();
    const offSize = this.readOffSize();
    const offsetOrigin = this.data.cursor + offSize * (count + 1) - 1;
    const index = new klass();
    let offset = this.readOffset(offSize);
    for (let i = 0; i < count; ++i) {
      const nextOffset = this.readOffset(offSize);
      index.push(this.data.getSubView(offsetOrigin + offset, nextOffset - offset));
      offset = nextOffset;
    }
    this.data.cursor += index.dataSize;
    return index;
  }

  readDICT() {
    
  }

  readCharset() {
    const format = this.readCard8();
    if (format !== 1) { throw new Error('not implemented'); }
    
  }

  parse() {
    this.major = this.readCard8();
    this.minor = this.readCard8();
    this.hdrSize = this.readCard8();
    this.offSize = this.readOffSize();
    this.nameIndex = this.readINDEX();
    this.topDictIndex = this.readINDEX();
    this.stringIndex = this.readINDEX();
    this.globalSubrIndex = this.readINDEX();

    //this.charset = this.readCharset();
  }
}

class INDEX extends Array {
  get dataSize() {
    return this.reduce((sum, elem) => sum + elem.byteLength, 0);
  }
}

fetchArrayBuffer('./itc.cff').then((ab) => {
  var cff = new CFF(new SequentialDataView(ab));

  var table = document.createElement('table');
  console.log(cff);
});
