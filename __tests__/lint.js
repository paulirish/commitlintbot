const lint = require('../src/lint');

test('commitlint should work', async () => {

	expect(lint).toBeDefined();

	let ret = await lint('fix: ok');
	expect(ret.reportObj.valid).toEqual(true);

	ret = await lint('no type or message because no colon');
	expect(ret.reportObj.valid).toEqual(false);
	expect(ret.reportObj.errors.length).toEqual(2);

	ret = await lint('nondefaulttype: wont work');
	expect(ret.reportObj.valid).toEqual(false);
	expect(ret.reportObj.errors.length).toEqual(1);
});

// todo add tests for handling czConfig
