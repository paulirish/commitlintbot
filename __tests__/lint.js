const lint = require('../src/lint');
const {loadConfigFromString} = require('../src/index');

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

test('loadConfigFromString supports both CJS and ESM export default configs', async () => {
	const clintConfig = loadConfigFromString(`
		export default {
			extends: ['cz'],
			rules: {
				'header-max-length': [2, 'always', 80],
				'type-case': [2, 'always', 'lower-case'],
				'type-empty': [2, 'never'],
			},
		};
	`);
	const czConfig = loadConfigFromString(`
		export default {
			allowBreakingChanges: ['core'],
			allowCustomScopes: true,
			scopes: [],
			types: [
				{value: 'deps', name: 'deps: Dependency bumps only'},
			],
		};
	`);

	const ret = await lint('deps: remove angular devDependency', clintConfig, czConfig);
	expect(ret.reportObj.valid).toEqual(true);

	const invalidRet = await lint('invalid: remove angular devDependency', clintConfig, czConfig);
	expect(invalidRet.reportObj.valid).toEqual(false);
});

