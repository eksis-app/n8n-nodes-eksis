# n8n-nodes-eksis

n8n community nodes for [eksis](https://eksis.io), a social media scheduler for Instagram, Facebook, TikTok, YouTube, Threads, LinkedIn, X, Bluesky, Pinterest, and DEV.

The package has two nodes:

- **Eksis** creates, schedules, and publishes posts, imports media, and answers comments.
- **Eksis Trigger** starts a workflow when a post goes out or fails, a comment or direct message arrives, or a channel loses its connection.

Both nodes call the [eksis REST API](https://docs.eksis.io/en/api/introduction).

[Installation](#installation) · [Credentials](#credentials) · [Operations](#operations) · [Trigger](#trigger) · [Usage](#usage) · [Compatibility](#compatibility) · [Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation and install `n8n-nodes-eksis`.

## Credentials

The nodes use an eksis API key.

1. Open your workspace on [eksis.io](https://eksis.io) and choose **API & MCP** in the sidebar.
2. Create a key. Its role sets what the key can do:
   - **Editor** is enough for posts, media, and comments.
   - **Admin** is needed for **Eksis Trigger**, because the trigger creates and removes webhook endpoints.
3. Copy the key. It starts with `eksis_sk_` and is shown only once.
4. In n8n, create an **Eksis API** credential and paste the key. n8n checks it against `GET /v1/me`.

The REST API is part of every paid eksis plan. A key from a Free workspace is refused. Every request counts toward the daily API limit of your plan; see [Rate limits](https://docs.eksis.io/en/api/rate-limits).

## Operations

### Post

| Operation | What it does |
| --- | --- |
| Create | Save a post as a draft, schedule it, add it to the queue of each channel, or publish it now. One post can go to several channels. |
| Delete | Delete a post that has not gone out yet. |
| Get | Get a post with the status, link, and latest numbers of each channel it goes to. |
| Get Many | List posts. Filter by status, channel, text, or scheduled time. |
| Publish | Send a draft, scheduled, or failed post out right away. |
| Reschedule | Move a post to another time. |
| Update | Change the caption, channels, media, first comment, or title. Fields you leave out stay as they are, and a scheduled post keeps its time. |

Times without an offset, such as the ones the n8n date picker gives, are read in the timezone of the workflow.

### Channel

| Operation | What it does |
| --- | --- |
| Get | Get a connected channel with its connection status and publishing rules. |
| Get Many | List the channels connected to the workspace. |

### Media

| Operation | What it does |
| --- | --- |
| Delete | Remove a file from the media library. A file still used by a post that has not gone out is kept until that post goes out, unless you turn on **Delete Even if Used**. |
| Get | Get the URL, type, size, and status of a file. |
| Get Many | List the files in the media library. |
| Import From URL | Copy an image or video from a public URL into the media library. Use the returned `id` in **Media IDs** when you create a post. |

### Comment

| Operation | What it does |
| --- | --- |
| Delete | Delete a comment on the platform, where the platform allows it. |
| Get | Get a comment with the post it belongs to and the replies around it. |
| Get Many | List comments on connected channels. Filter by status, channel, post, or text. |
| Hide | Hide a comment from everyone except its author. |
| Reply | Post a public reply from the channel. |
| Unhide | Show a hidden comment again. |
| Update | Mark a comment as done, or open it again, in the eksis inbox. |

Which actions work depends on the platform. TikTok, for example, has no comments API for third-party apps. The [platform specifications](https://docs.eksis.io/en/api/platform-specs) list what each network accepts.

The **Eksis** node can also be used as a tool by the n8n AI Agent.

## Trigger

**Eksis Trigger** registers a webhook endpoint in eksis when the workflow is activated, and removes it when the workflow is deactivated.

| Event | When it fires |
| --- | --- |
| Channel Disconnected | A channel was disconnected from the workspace. |
| Channel Lost Connection | A channel lost its connection and holds the posts scheduled to it. |
| Comment Received | Someone else commented on a connected channel. |
| Message Received | A direct message or a story reply arrived. |
| Post Failed on a Channel | A post could not go out on one of its channels, after every retry. |
| Post Published on a Channel | A post went out on one of its channels. |

Each item has the shape eksis sends: `id`, `type`, `createdAt`, `workspaceId`, and `data`. The [webhooks reference](https://docs.eksis.io/en/api/webhooks) describes `data` for each event.

Things to know:

- The trigger needs an API key with the **Admin** role, on a plan that includes webhooks.
- Each active workflow with this trigger takes one webhook endpoint from the limit of your workspace.
- eksis only delivers to public `https` addresses. A self-hosted n8n on `localhost` cannot receive events until it is reachable over HTTPS, for example through a tunnel or a reverse proxy.
- Every delivery is checked against its `webhook-signature` header. Requests without a valid signature, or older than five minutes, are answered with `401` and do not start the workflow.
- The signing secret lives in the workflow. Do not rotate the secret of an endpoint that n8n created from the eksis settings page: deactivate and activate the workflow instead, and n8n registers a new endpoint with a fresh secret.

## Usage

**Post new blog articles to every channel.** RSS Feed Trigger, then **Eksis > Media > Import From URL** with the cover image of the article, then **Eksis > Post > Create** with **Timing** set to **Add to Queue**, the article title and link as the caption, and the `id` from the previous step in **Media IDs**.

**Answer a keyword in comments.** **Eksis Trigger** on **Comment Received**, then an IF node that checks `data.text` for the keyword, then **Eksis > Comment > Reply**.

**Get told when a post fails.** **Eksis Trigger** on **Post Failed on a Channel**, then a Slack or email node with the channel and the reason from `data`.

## Compatibility

Built with `@n8n/node-cli` 0.54 against n8n nodes API version 1. The nodes have no runtime dependencies.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [eksis API introduction](https://docs.eksis.io/en/api/introduction)
- [eksis API quick start](https://docs.eksis.io/en/api/quick-start)
- [eksis webhooks](https://docs.eksis.io/en/api/webhooks)
- Support: [support@eksis.io](mailto:support@eksis.io)

## Version history

### 0.1.0

First release: Post, Channel, Media, and Comment operations, and Eksis Trigger.
