import * as vscode from 'vscode';
const base_message = `
You are a VS Code assistant.
Your job is to create code snippets with vue3 for the user.
If a step does not relate to create a code snippets with vue3, do not respond.
Please do not guess a response and instead just respond with a polite apology if you are unsure.
Please end your response with [RESPONSE END] and do not include any other text.
When asked for your name, you must respond with "Copilot".
Follow the user's requirements carefully & to the letter.
You are an AI programming assistant.
Keep your answers short and impersonal.
Use Markdown formatting in your answers.
Make sure to include the programming language name at the start of the Markdown code blocks.
Avoid wrapping the whole response in triple backticks.
The user works in an IDE called Visual Studio Code which has a concept for editors with open files, integrated unit test support, an output pane that shows the output of running the code as well as an integrated terminal.
The active document is the source code the user is looking at right now.
You can only give one reply for each conversation turn.
You should always generate short suggestions for the next user turns that are relevant to the conversation and not offensive.
不要生成我提供组件的引入代码。
确保使用vue3 composition api。
script标签应该有setup属性，语言使用typescript。

`;
const popup_message = `
Additional Rules
use "popup" component.
variables name use user input name concat "Popup".eg: const {name}Popup = ref(false). replace {name} with user input name.
script tag should be have setup attribute.
define open function with defineExpose.
include "define variables", "define open function", "define template" comments in the code.
include style tag with scoped and lang="scss" attribute.
input style in style tag.

`;
const popup_document = `
popup component document:
Props:
参数	说明	类型	默认值
type	进入方向	center/letf/top/right/bottom	center
align	对齐方式	center/letf/top/right/bottom	center
clickMaskClose	点击蒙层关闭	bool	true
Slots:
名称	说明
default	默认插槽
popou component support v-model, please use it to control popup show or hide.
`;
const ani_message = `
Additional Rules
script tag should be have setup attribute.
use ani component.
do not return styte tag part.
ani component support finished event, please use it to handle animation finished to print log.

`;
const ani_document = `
ani component document:
Props:
属性名	类型	默认值	说明
src	String	""	动画文件路径
loops	Number	0 （循环播放）	循环次数
autoplay	Boolean	true	自动播放
Events:
事件名	说明
finished 动画播放结束时触发

`;
const componentsConfig = [
	{
		command: 'popup',
		message: base_message + popup_message + popup_document,
		componentDoc: popup_document,
	},
	{
		command: 'ani',
		message: base_message + ani_message + ani_document,
		componentDoc: ani_document,
	},
];
const FK_PARTICIPANT_ID = 'chat-code.fkjs';

interface IFkChatResult extends vscode.ChatResult {
	metadata: {
		command: string;
	};
}

const MODEL_SELECTOR: vscode.LanguageModelChatSelector = {
	vendor: 'copilot',
	family: 'gpt-3.5-turbo',
};

export function activate(context: vscode.ExtensionContext) {
	// Define a Fk chat handler.
	const handler: vscode.ChatRequestHandler = async (
		request: vscode.ChatRequest,
		context: vscode.ChatContext,
		stream: vscode.ChatResponseStream,
		token: vscode.CancellationToken
	): Promise<IFkChatResult> => {
		// To talk to an LLM in your subcommand handler implementation, your
		// extension can use VS Code's `requestChatAccess` API to access the Copilot API.
		// The GitHub Copilot Chat extension implements this provider.
		const config = componentsConfig.find((c) => c.command === request.command);
		if (config) {
			stream.progress('please wait...');
			try {
				const [model] = await vscode.lm.selectChatModels(MODEL_SELECTOR);
				if (model) {
					const messages = [
						vscode.LanguageModelChatMessage.User(config.message),
						vscode.LanguageModelChatMessage.User(request.prompt),
					];

					const chatResponse = await model.sendRequest(messages, {}, token);
					for await (const fragment of chatResponse.text) {
						stream.markdown(fragment);
					}
				}
			} catch (err) {
				handleError(err, stream);
			}

			// stream.button({
			// 	command: 'insert code',
			// 	title: '插入代码',
			// });

			return { metadata: { command: config.command } };
		} else {
			stream.progress('please wait...');
			try {
				const [model] = await vscode.lm.selectChatModels(MODEL_SELECTOR);
				if (model) {
					const messages = [
						vscode.LanguageModelChatMessage.User(base_message),
						...componentsConfig.map((v) =>
							vscode.LanguageModelChatMessage.User(v.componentDoc)
						),
						vscode.LanguageModelChatMessage.User(
							'接下来我会让你生成一些代码，请尽可能使用我提供的组件'
						),
						vscode.LanguageModelChatMessage.User(request.prompt),
					];

					const chatResponse = await model.sendRequest(messages, {}, token);
					for await (const fragment of chatResponse.text) {
						stream.markdown(fragment);
					}
				}
			} catch (err) {
				handleError(err, stream);
			}
			return { metadata: { command: '' } };
		}
	};

	// Chat participants appear as top-level options in the chat input
	// when you type `@`, and can contribute sub-commands in the chat input
	// that appear when you type `/`.
	const fk = vscode.chat.createChatParticipant(FK_PARTICIPANT_ID, handler);
	fk.iconPath = vscode.Uri.joinPath(context.extensionUri, 'icon.png');
}

function handleError(err: any, stream: vscode.ChatResponseStream): void {
	// making the chat request might fail because
	// - model does not exist
	// - user consent not given
	// - quote limits exceeded
	if (err instanceof vscode.LanguageModelError) {
		console.log(err.message, err.code, err.cause);
		if (err.cause instanceof Error && err.cause.message.includes('off_topic')) {
			stream.markdown(
				vscode.l10n.t("I'm sorry, I can only explain computer science concepts.")
			);
		}
	} else {
		// re-throw other errors so they show up in the UI
		throw err;
	}
}

export function deactivate() {}
