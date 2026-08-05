service-chatgpt=ChatGPT
service-customgpt1=Custom GPT 1
service-customgpt2=Custom GPT 2
service-customgpt3=Custom GPT 3
service-azuregpt=AzureGPT
service-gemini=Gemini
service-claude=Claude
service-haici=Haici
service-bingdict=Bing Dict(en→zh)🔊
service-cambridgedict=Cambridge Dict(en→other)🔊
service-haicidict=Haici Dict(en→zh)🔊
service-collinsdict=Collins Dict(en→zh)🔊
service-youdaodict=Youdao Dict(en→zh)🔊
service-freedictionaryapi=FreeDictionaryAPI(en→en)
service-webliodict=Weblio Dict(en→ja)
service-gramotadict=Gramota.ru(ru)
service-errorPrefix=[Request Error]
    Service not available, invalid secret, or request too fast.
    Use another translation service or post the issue here:
    https://github.com/windingwind/zotero-pdf-translate/issues

    The message below is not Zotero or the Translate plugin, but from

service-dialog-config=Config
service-dialog-title={ $service } Config
service-dialog-save=Save
service-dialog-close=Close
service-dialog-help=Help
service-dialog-custom-request-description=Refer to API documentation of service provider, add custom parameters. These will be merged with the standard parameters (model, messages, temperature, stream).
service-dialog-custom-request-title=Custom Request Parameters
service-dialog-custom-request-add-param=Add Parameter
service-dialog-custom-request-parameter-name=Parameter Name
service-dialog-custom-request-parameter-value=Parameter Value
service-dialog-custom-request-parameter-name-placeholder=Parameter name
service-dialog-custom-request-parameter-value-placeholder=Parameter value (JSON format)
service-dialog-custom-request-validation-title=Can't Save Custom Parameters
service-dialog-custom-request-validation-summary=Some parameter values are not valid JSON. Please fix them and try again.
service-dialog-custom-request-validation-errors-head=Please check:
service-dialog-custom-request-validation-error-invalid=- { $key }: invalid format ({ $detail })
service-dialog-custom-request-validation-error-empty=- { $key }: value is empty
service-dialog-custom-request-validation-error-duplicate=- { $key }: duplicate parameter name
service-dialog-custom-request-validation-examples-head=Examples for the value field:
service-dialog-custom-request-validation-example-boolean=- Boolean: false
service-dialog-custom-request-validation-example-number=- Number: 123
service-dialog-custom-request-validation-example-string=- Text: "text"
service-dialog-custom-request-validation-example-object=- Object: { $example }

service-chatgpt-dialog-endPoint=API
service-chatgpt-dialog-model=Model
service-chatgpt-dialog-temperature=Temp
service-chatgpt-dialog-prompt=Prompt
service-chatgpt-dialog-stream=Stream
service-chatgpt-dialog-custom-request=Custom Request

service-azuregpt-dialog-endPoint=EndPoint
service-azuregpt-dialog-model=Name
service-azuregpt-dialog-temperature=Temp
service-azuregpt-dialog-apiVersion=Version
service-azuregpt-dialog-prompt=Prompt
service-azuregpt-dialog-stream=Stream
service-azuregpt-dialog-custom-request=Custom Request

service-gemini-dialog-endPoint=EndPoint
service-gemini-dialog-prompt=Prompt
service-gemini-dialog-stream=Stream

service-claude-dialog-endPoint=EndPoint
service-claude-dialog-model=Model
service-claude-dialog-temperature=Temp
service-claude-dialog-prompt=Prompt
service-claude-dialog-stream=Stream
service-claude-dialog-maxTokens=Max Tokens

readerpopup-translate-label=Translate
readerpopup-addToNote-label=Add Translation to Note

pref-title=Translate

field-titleTranslation=Title Translation
field-abstractTranslation=Abstract Translation

status-translating=Translating...
sideBarIcon-title=Translate annotation

service-manageKeys-title=Manage Translation Service Keys
service-manageKeys-head=Manage all translation service keys. Edit the JSON directly and click Save.
service-manageKeys-save=Save
service-manageKeys-close=Close

service-renameServices-title=Rename Custom GPT Services
service-renameServices-head=Input the new name and click Save.
service-renameServices-hint=Changes take effect after restarting the plugin or Zotero
service-renameServices-save=Save
service-renameServices-close=Close
