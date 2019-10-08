import { md5Hash, sha1Hmac } from './crypto';
import { expect } from 'chai';

// tslint:disable-next-line
import 'mocha';

describe('md5Hash', () => {

  it('should return e10adc3949ba59abbe56e057f20f883e for 123456', () => {
    const result = md5Hash('123456');
    expect(result).to.equal('e10adc3949ba59abbe56e057f20f883e');
  });

});

describe('sha1Hmac', () => {

  it('should return 85d155c55ed286a300bd1cf124de08d87e914f3a for foo/bar', () => {
    const result = sha1Hmac('foo', 'bar');
    expect(result).to.equal('85d155c55ed286a300bd1cf124de08d87e914f3a');
  });

});
