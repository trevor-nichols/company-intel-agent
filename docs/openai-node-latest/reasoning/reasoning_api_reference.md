response.reasoning_summary_part.added
Emitted when a new reasoning summary part is added.

item_id
string

The ID of the item this summary part is associated with.

output_index
integer

The index of the output item this summary part is associated with.

part
object

The summary part that was added.


Hide properties
text
string

The text of the summary part.

type
string

The type of the summary part. Always summary_text.

sequence_number
integer

The sequence number of this event.

summary_index
integer

The index of the summary part within the reasoning summary.

type
string

The type of the event. Always response.reasoning_summary_part.added.

OBJECT response.reasoning_summary_part.added
{
  "type": "response.reasoning_summary_part.added",
  "item_id": "rs_6806bfca0b2481918a5748308061a2600d3ce51bdffd5476",
  "output_index": 0,
  "summary_index": 0,
  "part": {
    "type": "summary_text",
    "text": ""
  },
  "sequence_number": 1
}
response.reasoning_summary_part.done
Emitted when a reasoning summary part is completed.

item_id
string

The ID of the item this summary part is associated with.

output_index
integer

The index of the output item this summary part is associated with.

part
object

The completed summary part.


Show properties
sequence_number
integer

The sequence number of this event.

summary_index
integer

The index of the summary part within the reasoning summary.

type
string

The type of the event. Always response.reasoning_summary_part.done.

OBJECT response.reasoning_summary_part.done
{
  "type": "response.reasoning_summary_part.done",
  "item_id": "rs_6806bfca0b2481918a5748308061a2600d3ce51bdffd5476",
  "output_index": 0,
  "summary_index": 0,
  "part": {
    "type": "summary_text",
    "text": "**Responding to a greeting**\n\nThe user just said, \"Hello!\" So, it seems I need to engage. I'll greet them back and offer help since they're looking to chat. I could say something like, \"Hello! How can I assist you today?\" That feels friendly and open. They didn't ask a specific question, so this approach will work well for starting a conversation. Let's see where it goes from there!"
  },
  "sequence_number": 1
}
response.reasoning_summary_text.delta
Emitted when a delta is added to a reasoning summary text.

delta
string

The text delta that was added to the summary.

item_id
string

The ID of the item this summary text delta is associated with.

output_index
integer

The index of the output item this summary text delta is associated with.

sequence_number
integer

The sequence number of this event.

summary_index
integer

The index of the summary part within the reasoning summary.

type
string

The type of the event. Always response.reasoning_summary_text.delta.

OBJECT response.reasoning_summary_text.delta
{
  "type": "response.reasoning_summary_text.delta",
  "item_id": "rs_6806bfca0b2481918a5748308061a2600d3ce51bdffd5476",
  "output_index": 0,
  "summary_index": 0,
  "delta": "**Responding to a greeting**\n\nThe user just said, \"Hello!\" So, it seems I need to engage. I'll greet them back and offer help since they're looking to chat. I could say something like, \"Hello! How can I assist you today?\" That feels friendly and open. They didn't ask a specific question, so this approach will work well for starting a conversation. Let's see where it goes from there!",
  "sequence_number": 1
}
response.reasoning_summary_text.done
Emitted when a reasoning summary text is completed.

item_id
string

The ID of the item this summary text is associated with.

output_index
integer

The index of the output item this summary text is associated with.

sequence_number
integer

The sequence number of this event.

summary_index
integer

The index of the summary part within the reasoning summary.

text
string

The full text of the completed reasoning summary.

type
string

The type of the event. Always response.reasoning_summary_text.done.

OBJECT response.reasoning_summary_text.done
{
  "type": "response.reasoning_summary_text.done",
  "item_id": "rs_6806bfca0b2481918a5748308061a2600d3ce51bdffd5476",
  "output_index": 0,
  "summary_index": 0,
  "text": "**Responding to a greeting**\n\nThe user just said, \"Hello!\" So, it seems I need to engage. I'll greet them back and offer help since they're looking to chat. I could say something like, \"Hello! How can I assist you today?\" That feels friendly and open. They didn't ask a specific question, so this approach will work well for starting a conversation. Let's see where it goes from there!",
  "sequence_number": 1
}
response.reasoning_text.delta
Emitted when a delta is added to a reasoning text.

content_index
integer

The index of the reasoning content part this delta is associated with.

delta
string

The text delta that was added to the reasoning content.

item_id
string

The ID of the item this reasoning text delta is associated with.

output_index
integer

The index of the output item this reasoning text delta is associated with.

sequence_number
integer

The sequence number of this event.

type
string

The type of the event. Always response.reasoning_text.delta.

OBJECT response.reasoning_text.delta
{
  "type": "response.reasoning_text.delta",
  "item_id": "rs_123",
  "output_index": 0,
  "content_index": 0,
  "delta": "The",
  "sequence_number": 1
}
response.reasoning_text.done
Emitted when a reasoning text is completed.

content_index
integer

The index of the reasoning content part.

item_id
string

The ID of the item this reasoning text is associated with.

output_index
integer

The index of the output item this reasoning text is associated with.

sequence_number
integer

The sequence number of this event.

text
string

The full text of the completed reasoning content.

type
string

The type of the event. Always response.reasoning_text.done.

OBJECT response.reasoning_text.done
{
  "type": "response.reasoning_text.done",
  "item_id": "rs_123",
  "output_index": 0,
  "content_index": 0,
  "text": "The user is asking...",
  "sequence_number": 4
}
