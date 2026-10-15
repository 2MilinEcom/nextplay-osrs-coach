import test from 'node:test';
import assert from 'node:assert/strict';
import {parseByteRange} from '../lib/range.ts';

test('seeking handles a bounded range and an open-ended range',()=>{
  assert.deepEqual(parseByteRange('bytes=10-19',100),{offset:10,length:10});
  assert.deepEqual(parseByteRange('bytes=95-',100),{offset:95,length:5});
});
test('suffix ranges and end-of-file clipping preserve the true object size',()=>{
  assert.deepEqual(parseByteRange('bytes=-15',100),{offset:85,length:15});
  assert.deepEqual(parseByteRange('bytes=95-999',100),{offset:95,length:5});
});
test('malformed and unsatisfiable ranges are rejected',()=>{
  for(const header of ['bytes=100-','bytes=20-10','bytes=-0','bytes=1-2,3-4','items=0-10']){
    assert.equal(parseByteRange(header,100),null,header);
  }
});
