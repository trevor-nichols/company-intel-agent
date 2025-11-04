# OpenAI Node v6.1.0

Shared
Types:

AllModels
ChatModel
ComparisonFilter
CompoundFilter
CustomToolInputFormat
ErrorObject
FunctionDefinition
FunctionParameters
Metadata
Reasoning
ReasoningEffort
ResponseFormatJSONObject
ResponseFormatJSONSchema
ResponseFormatText
ResponseFormatTextGrammar
ResponseFormatTextPython
ResponsesModel
Completions
Types:

Completion
CompletionChoice
CompletionUsage
Methods:

client.completions.create({ ...params }) -> Completion
Chat
Types:

ChatModel
Completions
Types:

ChatCompletion
ChatCompletionAllowedToolChoice
ChatCompletionAssistantMessageParam
ChatCompletionAudio
ChatCompletionAudioParam
ChatCompletionChunk
ChatCompletionContentPart
ChatCompletionContentPartImage
ChatCompletionContentPartInputAudio
ChatCompletionContentPartRefusal
ChatCompletionContentPartText
ChatCompletionCustomTool
ChatCompletionDeleted
ChatCompletionDeveloperMessageParam
ChatCompletionFunctionCallOption
ChatCompletionFunctionMessageParam
ChatCompletionFunctionTool
ChatCompletionMessage
ChatCompletionMessageCustomToolCall
ChatCompletionMessageFunctionToolCall
ChatCompletionMessageParam
ChatCompletionMessageToolCall
ChatCompletionModality
ChatCompletionNamedToolChoice
ChatCompletionNamedToolChoiceCustom
ChatCompletionPredictionContent
ChatCompletionRole
ChatCompletionStoreMessage
ChatCompletionStreamOptions
ChatCompletionSystemMessageParam
ChatCompletionTokenLogprob
ChatCompletionTool
ChatCompletionToolChoiceOption
ChatCompletionToolMessageParam
ChatCompletionUserMessageParam
ChatCompletionAllowedTools
ChatCompletionReasoningEffort
Methods:

client.chat.completions.create({ ...params }) -> ChatCompletion
client.chat.completions.retrieve(completionID) -> ChatCompletion
client.chat.completions.update(completionID, { ...params }) -> ChatCompletion
client.chat.completions.list({ ...params }) -> ChatCompletionsPage
client.chat.completions.delete(completionID) -> ChatCompletionDeleted
Messages
Methods:

client.chat.completions.messages.list(completionID, { ...params }) -> ChatCompletionStoreMessagesPage
Embeddings
Types:

CreateEmbeddingResponse
Embedding
EmbeddingModel
Methods:

client.embeddings.create({ ...params }) -> CreateEmbeddingResponse
Files
Types:

FileContent
FileDeleted
FileObject
FilePurpose
Methods:

client.files.create({ ...params }) -> FileObject
client.files.retrieve(fileID) -> FileObject
client.files.list({ ...params }) -> FileObjectsPage
client.files.delete(fileID) -> FileDeleted
client.files.content(fileID) -> Response
client.files.waitForProcessing(id, { pollInterval = 5000, maxWait = 30 _ 60 _ 1000 }) -> Promise<FileObject>
Images
Types:

Image
ImageEditCompletedEvent
ImageEditPartialImageEvent
ImageEditStreamEvent
ImageGenCompletedEvent
ImageGenPartialImageEvent
ImageGenStreamEvent
ImageModel
ImagesResponse
Methods:

client.images.createVariation({ ...params }) -> ImagesResponse
client.images.edit({ ...params }) -> ImagesResponse
client.images.generate({ ...params }) -> ImagesResponse
Audio
Types:

AudioModel
AudioResponseFormat
Transcriptions
Types:

Transcription
TranscriptionInclude
TranscriptionSegment
TranscriptionStreamEvent
TranscriptionTextDeltaEvent
TranscriptionTextDoneEvent
TranscriptionVerbose
TranscriptionWord
TranscriptionCreateResponse
Methods:

client.audio.transcriptions.create({ ...params }) -> TranscriptionCreateResponse
Translations
Types:

Translation
TranslationVerbose
TranslationCreateResponse
Methods:

client.audio.translations.create({ ...params }) -> TranslationCreateResponse
Speech
Types:

SpeechModel
Methods:

client.audio.speech.create({ ...params }) -> Response
Moderations
Types:

Moderation
ModerationImageURLInput
ModerationModel
ModerationMultiModalInput
ModerationTextInput
ModerationCreateResponse
Methods:

client.moderations.create({ ...params }) -> ModerationCreateResponse
Models
Types:

Model
ModelDeleted
Methods:

client.models.retrieve(model) -> Model
client.models.list() -> ModelsPage
client.models.delete(model) -> ModelDeleted
FineTuning
Methods
Types:

DpoHyperparameters
DpoMethod
ReinforcementHyperparameters
ReinforcementMethod
SupervisedHyperparameters
SupervisedMethod
Jobs
Types:

FineTuningJob
FineTuningJobEvent
FineTuningJobWandbIntegration
FineTuningJobWandbIntegrationObject
FineTuningJobIntegration
Methods:

client.fineTuning.jobs.create({ ...params }) -> FineTuningJob
client.fineTuning.jobs.retrieve(fineTuningJobID) -> FineTuningJob
client.fineTuning.jobs.list({ ...params }) -> FineTuningJobsPage
client.fineTuning.jobs.cancel(fineTuningJobID) -> FineTuningJob
client.fineTuning.jobs.listEvents(fineTuningJobID, { ...params }) -> FineTuningJobEventsPage
client.fineTuning.jobs.pause(fineTuningJobID) -> FineTuningJob
client.fineTuning.jobs.resume(fineTuningJobID) -> FineTuningJob
Checkpoints
Types:

FineTuningJobCheckpoint
Methods:

client.fineTuning.jobs.checkpoints.list(fineTuningJobID, { ...params }) -> FineTuningJobCheckpointsPage
Checkpoints
Permissions
Types:

PermissionCreateResponse
PermissionRetrieveResponse
PermissionDeleteResponse
Methods:

client.fineTuning.checkpoints.permissions.create(fineTunedModelCheckpoint, { ...params }) -> PermissionCreateResponsesPage
client.fineTuning.checkpoints.permissions.retrieve(fineTunedModelCheckpoint, { ...params }) -> PermissionRetrieveResponse
client.fineTuning.checkpoints.permissions.delete(permissionID, { ...params }) -> PermissionDeleteResponse
Alpha
Graders
Types:

GraderRunResponse
GraderValidateResponse
Methods:

client.fineTuning.alpha.graders.run({ ...params }) -> GraderRunResponse
client.fineTuning.alpha.graders.validate({ ...params }) -> GraderValidateResponse
Graders
GraderModels
Types:

LabelModelGrader
MultiGrader
PythonGrader
ScoreModelGrader
StringCheckGrader
TextSimilarityGrader
VectorStores
Types:

AutoFileChunkingStrategyParam
FileChunkingStrategy
FileChunkingStrategyParam
OtherFileChunkingStrategyObject
StaticFileChunkingStrategy
StaticFileChunkingStrategyObject
StaticFileChunkingStrategyObjectParam
VectorStore
VectorStoreDeleted
VectorStoreSearchResponse
Methods:

client.vectorStores.create({ ...params }) -> VectorStore
client.vectorStores.retrieve(vectorStoreID) -> VectorStore
client.vectorStores.update(vectorStoreID, { ...params }) -> VectorStore
client.vectorStores.list({ ...params }) -> VectorStoresPage
client.vectorStores.delete(vectorStoreID) -> VectorStoreDeleted
client.vectorStores.search(vectorStoreID, { ...params }) -> VectorStoreSearchResponsesPage
Files
Types:

VectorStoreFile
VectorStoreFileDeleted
FileContentResponse
Methods:

client.vectorStores.files.create(vectorStoreId, { ...params }) -> VectorStoreFile
client.vectorStores.files.retrieve(vectorStoreId, fileId) -> VectorStoreFile
client.vectorStores.files.update(vectorStoreId, fileId, { ...params }) -> VectorStoreFile
client.vectorStores.files.list(vectorStoreId, { ...params }) -> VectorStoreFilesPage
client.vectorStores.files.del(vectorStoreId, fileId) -> VectorStoreFileDeleted
client.vectorStores.files.content(vectorStoreId, fileId) -> FileContentResponsesPage
client.vectorStores.files.createAndPoll(vectorStoreId, body, options?) -> Promise<VectorStoreFile>
client.vectorStores.files.poll(vectorStoreId, fileId, options?) -> Promise<VectorStoreFile>
client.vectorStores.files.upload(vectorStoreId, file, options?) -> Promise<VectorStoreFile>
client.vectorStores.files.uploadAndPoll(vectorStoreId, file, options?) -> Promise<VectorStoreFile>
FileBatches
Types:

VectorStoreFileBatch
Methods:

client.vectorStores.fileBatches.create(vectorStoreID, { ...params }) -> VectorStoreFileBatch
client.vectorStores.fileBatches.retrieve(batchID, { ...params }) -> VectorStoreFileBatch
client.vectorStores.fileBatches.cancel(batchID, { ...params }) -> VectorStoreFileBatch
client.vectorStores.fileBatches.listFiles(batchID, { ...params }) -> VectorStoreFilesPage
client.vectorStores.files.createAndPoll(vectorStoreId, body, options?) -> Promise<VectorStoreFile>
client.vectorStores.files.poll(vectorStoreId, fileId, options?) -> Promise<VectorStoreFile>
client.vectorStores.files.upload(vectorStoreId, file, options?) -> Promise<VectorStoreFile>
client.vectorStores.files.uploadAndPoll(vectorStoreId, file, options?) -> Promise<VectorStoreFile>
Webhooks
Types:

BatchCancelledWebhookEvent
BatchCompletedWebhookEvent
BatchExpiredWebhookEvent
BatchFailedWebhookEvent
EvalRunCanceledWebhookEvent
EvalRunFailedWebhookEvent
EvalRunSucceededWebhookEvent
FineTuningJobCancelledWebhookEvent
FineTuningJobFailedWebhookEvent
FineTuningJobSucceededWebhookEvent
RealtimeCallIncomingWebhookEvent
ResponseCancelledWebhookEvent
ResponseCompletedWebhookEvent
ResponseFailedWebhookEvent
ResponseIncompleteWebhookEvent
UnwrapWebhookEvent
Methods:

client.webhooks.unwrap(payload, headers, secret?, tolerance?) -> UnwrapWebhookEvent
client.webhooks.verifySignature(payload, headers, secret?, tolerance?) -> void
Beta
Realtime
Types:

ConversationCreatedEvent
ConversationItem
ConversationItemContent
ConversationItemCreateEvent
ConversationItemCreatedEvent
ConversationItemDeleteEvent
ConversationItemDeletedEvent
ConversationItemInputAudioTranscriptionCompletedEvent
ConversationItemInputAudioTranscriptionDeltaEvent
ConversationItemInputAudioTranscriptionFailedEvent
ConversationItemRetrieveEvent
ConversationItemTruncateEvent
ConversationItemTruncatedEvent
ConversationItemWithReference
ErrorEvent
InputAudioBufferAppendEvent
InputAudioBufferClearEvent
InputAudioBufferClearedEvent
InputAudioBufferCommitEvent
InputAudioBufferCommittedEvent
InputAudioBufferSpeechStartedEvent
InputAudioBufferSpeechStoppedEvent
RateLimitsUpdatedEvent
RealtimeClientEvent
RealtimeResponse
RealtimeResponseStatus
RealtimeResponseUsage
RealtimeServerEvent
ResponseAudioDeltaEvent
ResponseAudioDoneEvent
ResponseAudioTranscriptDeltaEvent
ResponseAudioTranscriptDoneEvent
ResponseCancelEvent
ResponseContentPartAddedEvent
ResponseContentPartDoneEvent
ResponseCreateEvent
ResponseCreatedEvent
ResponseDoneEvent
ResponseFunctionCallArgumentsDeltaEvent
ResponseFunctionCallArgumentsDoneEvent
ResponseOutputItemAddedEvent
ResponseOutputItemDoneEvent
ResponseTextDeltaEvent
ResponseTextDoneEvent
SessionCreatedEvent
SessionUpdateEvent
SessionUpdatedEvent
TranscriptionSessionUpdate
TranscriptionSessionUpdatedEvent
Sessions
Types:

Session
SessionCreateResponse
Methods:

client.beta.realtime.sessions.create({ ...params }) -> SessionCreateResponse
TranscriptionSessions
Types:

TranscriptionSession
Methods:

client.beta.realtime.transcriptionSessions.create({ ...params }) -> TranscriptionSession
Assistants
Types:

Assistant
AssistantDeleted
AssistantStreamEvent
AssistantTool
CodeInterpreterTool
FileSearchTool
FunctionTool
MessageStreamEvent
RunStepStreamEvent
RunStreamEvent
ThreadStreamEvent
Methods:

client.beta.assistants.create({ ...params }) -> Assistant
client.beta.assistants.retrieve(assistantID) -> Assistant
client.beta.assistants.update(assistantID, { ...params }) -> Assistant
client.beta.assistants.list({ ...params }) -> AssistantsPage
client.beta.assistants.delete(assistantID) -> AssistantDeleted
Threads
Types:

AssistantResponseFormatOption
AssistantToolChoice
AssistantToolChoiceFunction
AssistantToolChoiceOption
Thread
ThreadDeleted
Methods:

client.beta.threads.create({ ...params }) -> Thread
client.beta.threads.retrieve(threadID) -> Thread
client.beta.threads.update(threadID, { ...params }) -> Thread
client.beta.threads.delete(threadID) -> ThreadDeleted
client.beta.threads.createAndRun({ ...params }) -> Run
client.beta.threads.createAndRunPoll(body, options?) -> Promise<Threads.Run>
client.beta.threads.createAndRunStream(body, options?) -> AssistantStream
Runs
Types:

RequiredActionFunctionToolCall
Run
RunStatus
Methods:

client.beta.threads.runs.create(threadID, { ...params }) -> Run
client.beta.threads.runs.retrieve(runID, { ...params }) -> Run
client.beta.threads.runs.update(runID, { ...params }) -> Run
client.beta.threads.runs.list(threadID, { ...params }) -> RunsPage
client.beta.threads.runs.cancel(runID, { ...params }) -> Run
client.beta.threads.runs.submitToolOutputs(runID, { ...params }) -> Run
client.beta.threads.runs.createAndPoll(threadId, body, options?) -> Promise<Run>
client.beta.threads.runs.createAndStream(threadId, body, options?) -> AssistantStream
client.beta.threads.runs.poll(threadId, runId, options?) -> Promise<Run>
client.beta.threads.runs.stream(threadId, body, options?) -> AssistantStream
client.beta.threads.runs.submitToolOutputsAndPoll(threadId, runId, body, options?) -> Promise<Run>
client.beta.threads.runs.submitToolOutputsStream(threadId, runId, body, options?) -> AssistantStream
Steps
Types:

CodeInterpreterLogs
CodeInterpreterOutputImage
CodeInterpreterToolCall
CodeInterpreterToolCallDelta
FileSearchToolCall
FileSearchToolCallDelta
FunctionToolCall
FunctionToolCallDelta
MessageCreationStepDetails
RunStep
RunStepDelta
RunStepDeltaEvent
RunStepDeltaMessageDelta
RunStepInclude
ToolCall
ToolCallDelta
ToolCallDeltaObject
ToolCallsStepDetails
Methods:

client.beta.threads.runs.steps.retrieve(stepID, { ...params }) -> RunStep
client.beta.threads.runs.steps.list(runID, { ...params }) -> RunStepsPage
Messages
Types:

Annotation
AnnotationDelta
FileCitationAnnotation
FileCitationDeltaAnnotation
FilePathAnnotation
FilePathDeltaAnnotation
ImageFile
ImageFileContentBlock
ImageFileDelta
ImageFileDeltaBlock
ImageURL
ImageURLContentBlock
ImageURLDelta
ImageURLDeltaBlock
Message
MessageContent
MessageContentDelta
MessageContentPartParam
MessageDeleted
MessageDelta
MessageDeltaEvent
RefusalContentBlock
RefusalDeltaBlock
Text
TextContentBlock
TextContentBlockParam
TextDelta
TextDeltaBlock
Methods:

client.beta.threads.messages.create(threadID, { ...params }) -> Message
client.beta.threads.messages.retrieve(messageID, { ...params }) -> Message
client.beta.threads.messages.update(messageID, { ...params }) -> Message
client.beta.threads.messages.list(threadID, { ...params }) -> MessagesPage
client.beta.threads.messages.delete(messageID, { ...params }) -> MessageDeleted
Batches
Types:

Batch
BatchError
BatchRequestCounts
BatchUsage
Methods:

client.batches.create({ ...params }) -> Batch
client.batches.retrieve(batchID) -> Batch
client.batches.list({ ...params }) -> BatchesPage
client.batches.cancel(batchID) -> Batch
Uploads
Types:

Upload
Methods:

client.uploads.create({ ...params }) -> Upload
client.uploads.cancel(uploadID) -> Upload
client.uploads.complete(uploadID, { ...params }) -> Upload
Parts
Types:

UploadPart
Methods:

client.uploads.parts.create(uploadID, { ...params }) -> UploadPart
Responses
Types:

ComputerTool
CustomTool
EasyInputMessage
FileSearchTool
FunctionTool
Response
ResponseAudioDeltaEvent
ResponseAudioDoneEvent
ResponseAudioTranscriptDeltaEvent
ResponseAudioTranscriptDoneEvent
ResponseCodeInterpreterCallCodeDeltaEvent
ResponseCodeInterpreterCallCodeDoneEvent
ResponseCodeInterpreterCallCompletedEvent
ResponseCodeInterpreterCallInProgressEvent
ResponseCodeInterpreterCallInterpretingEvent
ResponseCodeInterpreterToolCall
ResponseCompletedEvent
ResponseComputerToolCall
ResponseComputerToolCallOutputItem
ResponseComputerToolCallOutputScreenshot
ResponseContent
ResponseContentPartAddedEvent
ResponseContentPartDoneEvent
ResponseConversationParam
ResponseCreatedEvent
ResponseCustomToolCall
ResponseCustomToolCallInputDeltaEvent
ResponseCustomToolCallInputDoneEvent
ResponseCustomToolCallOutput
ResponseError
ResponseErrorEvent
ResponseFailedEvent
ResponseFileSearchCallCompletedEvent
ResponseFileSearchCallInProgressEvent
ResponseFileSearchCallSearchingEvent
ResponseFileSearchToolCall
ResponseFormatTextConfig
ResponseFormatTextJSONSchemaConfig
ResponseFunctionCallArgumentsDeltaEvent
ResponseFunctionCallArgumentsDoneEvent
ResponseFunctionCallOutputItem
ResponseFunctionCallOutputItemList
ResponseFunctionToolCall
ResponseFunctionToolCallItem
ResponseFunctionToolCallOutputItem
ResponseFunctionWebSearch
ResponseImageGenCallCompletedEvent
ResponseImageGenCallGeneratingEvent
ResponseImageGenCallInProgressEvent
ResponseImageGenCallPartialImageEvent
ResponseInProgressEvent
ResponseIncludable
ResponseIncompleteEvent
ResponseInput
ResponseInputAudio
ResponseInputContent
ResponseInputFile
ResponseInputFileContent
ResponseInputImage
ResponseInputImageContent
ResponseInputItem
ResponseInputMessageContentList
ResponseInputMessageItem
ResponseInputText
ResponseInputTextContent
ResponseItem
ResponseMcpCallArgumentsDeltaEvent
ResponseMcpCallArgumentsDoneEvent
ResponseMcpCallCompletedEvent
ResponseMcpCallFailedEvent
ResponseMcpCallInProgressEvent
ResponseMcpListToolsCompletedEvent
ResponseMcpListToolsFailedEvent
ResponseMcpListToolsInProgressEvent
ResponseOutputAudio
ResponseOutputItem
ResponseOutputItemAddedEvent
ResponseOutputItemDoneEvent
ResponseOutputMessage
ResponseOutputRefusal
ResponseOutputText
ResponseOutputTextAnnotationAddedEvent
ResponsePrompt
ResponseQueuedEvent
ResponseReasoningItem
ResponseReasoningSummaryPartAddedEvent
ResponseReasoningSummaryPartDoneEvent
ResponseReasoningSummaryTextDeltaEvent
ResponseReasoningSummaryTextDoneEvent
ResponseReasoningTextDeltaEvent
ResponseReasoningTextDoneEvent
ResponseRefusalDeltaEvent
ResponseRefusalDoneEvent
ResponseStatus
ResponseStreamEvent
ResponseTextConfig
ResponseTextDeltaEvent
ResponseTextDoneEvent
ResponseUsage
ResponseWebSearchCallCompletedEvent
ResponseWebSearchCallInProgressEvent
ResponseWebSearchCallSearchingEvent
Tool
ToolChoiceAllowed
ToolChoiceCustom
ToolChoiceFunction
ToolChoiceMcp
ToolChoiceOptions
ToolChoiceTypes
WebSearchPreviewTool
WebSearchTool
Methods:

client.responses.create({ ...params }) -> Response
client.responses.retrieve(responseID, { ...params }) -> Response
client.responses.delete(responseID) -> void
client.responses.cancel(responseID) -> Response
InputItems
Types:

ResponseItemList
Methods:

client.responses.inputItems.list(responseID, { ...params }) -> ResponseItemsPage
Realtime
Types:

AudioTranscription
ConversationCreatedEvent
ConversationItem
ConversationItemAdded
ConversationItemCreateEvent
ConversationItemCreatedEvent
ConversationItemDeleteEvent
ConversationItemDeletedEvent
ConversationItemDone
ConversationItemInputAudioTranscriptionCompletedEvent
ConversationItemInputAudioTranscriptionDeltaEvent
ConversationItemInputAudioTranscriptionFailedEvent
ConversationItemInputAudioTranscriptionSegment
ConversationItemRetrieveEvent
ConversationItemTruncateEvent
ConversationItemTruncatedEvent
ConversationItemWithReference
InputAudioBufferAppendEvent
InputAudioBufferClearEvent
InputAudioBufferClearedEvent
InputAudioBufferCommitEvent
InputAudioBufferCommittedEvent
InputAudioBufferSpeechStartedEvent
InputAudioBufferSpeechStoppedEvent
InputAudioBufferTimeoutTriggered
LogProbProperties
McpListToolsCompleted
McpListToolsFailed
McpListToolsInProgress
NoiseReductionType
OutputAudioBufferClearEvent
RateLimitsUpdatedEvent
RealtimeAudioConfig
RealtimeAudioConfigInput
RealtimeAudioConfigOutput
RealtimeAudioFormats
RealtimeAudioInputTurnDetection
RealtimeClientEvent
RealtimeConversationItemAssistantMessage
RealtimeConversationItemFunctionCall
RealtimeConversationItemFunctionCallOutput
RealtimeConversationItemSystemMessage
RealtimeConversationItemUserMessage
RealtimeError
RealtimeErrorEvent
RealtimeFunctionTool
RealtimeMcpApprovalRequest
RealtimeMcpApprovalResponse
RealtimeMcpListTools
RealtimeMcpProtocolError
RealtimeMcpToolCall
RealtimeMcpToolExecutionError
RealtimeMcphttpError
RealtimeResponse
RealtimeResponseCreateAudioOutput
RealtimeResponseCreateMcpTool
RealtimeResponseCreateParams
RealtimeResponseStatus
RealtimeResponseUsage
RealtimeResponseUsageInputTokenDetails
RealtimeResponseUsageOutputTokenDetails
RealtimeServerEvent
RealtimeSession
RealtimeSessionCreateRequest
RealtimeToolChoiceConfig
RealtimeToolsConfig
RealtimeToolsConfigUnion
RealtimeTracingConfig
RealtimeTranscriptionSessionAudio
RealtimeTranscriptionSessionAudioInput
RealtimeTranscriptionSessionAudioInputTurnDetection
RealtimeTranscriptionSessionCreateRequest
RealtimeTruncation
RealtimeTruncationRetentionRatio
ResponseAudioDeltaEvent
ResponseAudioDoneEvent
ResponseAudioTranscriptDeltaEvent
ResponseAudioTranscriptDoneEvent
ResponseCancelEvent
ResponseContentPartAddedEvent
ResponseContentPartDoneEvent
ResponseCreateEvent
ResponseCreatedEvent
ResponseDoneEvent
ResponseFunctionCallArgumentsDeltaEvent
ResponseFunctionCallArgumentsDoneEvent
ResponseMcpCallArgumentsDelta
ResponseMcpCallArgumentsDone
ResponseMcpCallCompleted
ResponseMcpCallFailed
ResponseMcpCallInProgress
ResponseOutputItemAddedEvent
ResponseOutputItemDoneEvent
ResponseTextDeltaEvent
ResponseTextDoneEvent
SessionCreatedEvent
SessionUpdateEvent
SessionUpdatedEvent
TranscriptionSessionUpdate
TranscriptionSessionUpdatedEvent
ClientSecrets
Types:

RealtimeSessionClientSecret
RealtimeSessionCreateResponse
RealtimeTranscriptionSessionCreateResponse
RealtimeTranscriptionSessionTurnDetection
ClientSecretCreateResponse
Methods:

client.realtime.clientSecrets.create({ ...params }) -> ClientSecretCreateResponse
Calls
Methods:

client.realtime.calls.accept(callID, { ...params }) -> void
client.realtime.calls.hangup(callID) -> void
client.realtime.calls.refer(callID, { ...params }) -> void
client.realtime.calls.reject(callID, { ...params }) -> void
Conversations
Types:

ComputerScreenshotContent
Conversation
ConversationDeleted
ConversationDeletedResource
Message
SummaryTextContent
TextContent
InputTextContent
OutputTextContent
RefusalContent
InputImageContent
InputFileContent
Methods:

client.conversations.create({ ...params }) -> Conversation
client.conversations.retrieve(conversationID) -> Conversation
client.conversations.update(conversationID, { ...params }) -> Conversation
client.conversations.delete(conversationID) -> ConversationDeletedResource
Items
Types:

ConversationItem
ConversationItemList
Methods:

client.conversations.items.create(conversationID, { ...params }) -> ConversationItemList
client.conversations.items.retrieve(itemID, { ...params }) -> ConversationItem
client.conversations.items.list(conversationID, { ...params }) -> ConversationItemsPage
client.conversations.items.delete(itemID, { ...params }) -> Conversation
Evals
Types:

EvalCustomDataSourceConfig
EvalStoredCompletionsDataSourceConfig
EvalCreateResponse
EvalRetrieveResponse
EvalUpdateResponse
EvalListResponse
EvalDeleteResponse
Methods:

client.evals.create({ ...params }) -> EvalCreateResponse
client.evals.retrieve(evalID) -> EvalRetrieveResponse
client.evals.update(evalID, { ...params }) -> EvalUpdateResponse
client.evals.list({ ...params }) -> EvalListResponsesPage
client.evals.delete(evalID) -> EvalDeleteResponse
Runs
Types:

CreateEvalCompletionsRunDataSource
CreateEvalJSONLRunDataSource
EvalAPIError
RunCreateResponse
RunRetrieveResponse
RunListResponse
RunDeleteResponse
RunCancelResponse
Methods:

client.evals.runs.create(evalID, { ...params }) -> RunCreateResponse
client.evals.runs.retrieve(runID, { ...params }) -> RunRetrieveResponse
client.evals.runs.list(evalID, { ...params }) -> RunListResponsesPage
client.evals.runs.delete(runID, { ...params }) -> RunDeleteResponse
client.evals.runs.cancel(runID, { ...params }) -> RunCancelResponse
OutputItems
Types:

OutputItemRetrieveResponse
OutputItemListResponse
Methods:

client.evals.runs.outputItems.retrieve(outputItemID, { ...params }) -> OutputItemRetrieveResponse
client.evals.runs.outputItems.list(runID, { ...params }) -> OutputItemListResponsesPage
Containers
Types:

ContainerCreateResponse
ContainerRetrieveResponse
ContainerListResponse
Methods:

client.containers.create({ ...params }) -> ContainerCreateResponse
client.containers.retrieve(containerID) -> ContainerRetrieveResponse
client.containers.list({ ...params }) -> ContainerListResponsesPage
client.containers.delete(containerID) -> void
Files
Types:

FileCreateResponse
FileRetrieveResponse
FileListResponse
Methods:

client.containers.files.create(containerID, { ...params }) -> FileCreateResponse
client.containers.files.retrieve(fileID, { ...params }) -> FileRetrieveResponse
client.containers.files.list(containerID, { ...params }) -> FileListResponsesPage
client.containers.files.delete(fileID, { ...params }) -> void
Content
Methods:

client.containers.files.content.retrieve(fileID, { ...params }) -> Response