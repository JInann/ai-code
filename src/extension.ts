import * as vscode from 'vscode';
const popup_message = `
You are a VS Code assistant.
Your job is to create a popup with vue3.
If a step does not relate to create a popup with vue3, do not respond.
Please do not guess a response and instead just respond with a polite apology if you are unsure.
Please end your response with [RESPONSE END] and do not include any other text.
When asked for your name, you must respond with "Copilot".
Follow the user's requirements carefully & to the letter.
You are an AI programming assistant.
Keep your answers short and impersonal.
Keep your answers short and impersonal.
Use Markdown formatting in your answers.
Make sure to include the programming language name at the start of the Markdown code blocks.
Avoid wrapping the whole response in triple backticks.
The user works in an IDE called Visual Studio Code which has a concept for editors with open files, integrated unit test support, an output pane that shows the output of running the code as well as an integrated terminal.
The active document is the source code the user is looking at right now.
You can only give one reply for each conversation turn.
You should always generate short suggestions for the next user turns that are relevant to the conversation and not offensive.

Additional Rules
use "popup" component.
variables name use user input name concat "Popup".eg: const {name}Popup = ref(false). replace {name} with user input name.
script tag should be have setup attribute.
include "define variables", "define open function", "define template" comments in the code.
include style tag with scoped and lang="scss" attribute.
input style in style tag.

popup component doc:
Props:
参数	说明	类型	默认值
modelValue	进入方向	bool	false
type	进入方向	center/letf/top/right/bottom	center
align	对齐方式	center/letf/top/right/bottom	center
clickMaskClose	点击蒙层关闭	bool	true
Events:
事件名	说明	回调参数
update:modelValue	弹窗状态改变时触发	event: MouseEvent
Slots:
名称	说明
default	默认插槽

Examples:

## Valid setup question

User: 创建一个名字为cancel的弹窗
Assistant:

Sure, here's a popup with vue3.

# define variables

const cancelPopup = ref(false)

# define open function

defineExpose({
	open() {
		cancelPopup.value = true
	}
})

# define template
<popup v-model="cancelPopup">
      <div class="cancel-popup">
                
      </div>
</popup>


## Invalid setup question

User: 创建一个弹窗
Assistant: Sorry, I don't know how to set up a horse project.`;
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
		if (request.command === 'popup') {
			stream.progress('please wait...');
			try {
				const [model] = await vscode.lm.selectChatModels(MODEL_SELECTOR);
				if (model) {
					const messages = [
						vscode.LanguageModelChatMessage.User(popup_message),
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

			return { metadata: { command: 'popup' } };
		} else {
			return { metadata: { command: '' } };
		}
	};

	// Chat participants appear as top-level options in the chat input
	// when you type `@`, and can contribute sub-commands in the chat input
	// that appear when you type `/`.
	const fk = vscode.chat.createChatParticipant(FK_PARTICIPANT_ID, handler);
	fk.iconPath = vscode.Uri.joinPath(context.extensionUri, 'cat.jpeg');
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
