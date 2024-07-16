

### 方案概述

1. **音频捕获与分段**：前端定期捕获音频，并根据定时器和静音检测进行分段，避免单次处理超过AWS Lambda的最大执行时间。
2. **音频流处理**：每个音频段发送到AWS Lambda进行处理。Lambda函数调用Transcribe进行语音识别，并实时处理生成的文本，进行断句标识判断。
3. **文本传递**：检测到句子结束标点后，将当前段落通过SNS发送给另一个Lambda函数。
4. **SNS队列监控与自动加速**：TTS Lambda函数根据SNS队列积压情况调整播放速度，以确保及时播放音频。
5. **文本翻译与语音合成**：专门的Lambda函数接收到SNS消息后，进行翻译并调用Polly生成音频，直接返回给前端。

### 设计图纸
 ![image](https://github.com/user-attachments/assets/72e95929-fd3f-4826-a99b-b633bb9d6063)


### 主要技术点与实现方案

1. **音频捕获与分段**：
   - 使用WebRTC捕获音频流，并通过定时器和静音检测将音频流分成小段。
   - 定时器可以每15秒截取一次音频段，静音检测可以检测到较长的静音后进行分段。

2. **音频流处理**：
   - 每个音频段发送到AWS Lambda进行处理。
   - Lambda函数调用Transcribe进行语音识别，并实时处理生成的文本。检测到句子结束标点时，通过SNS发送给另一个Lambda函数。

3. **文本传递**：
   - 使用AWS SNS传递处理后的文本段落给专门的Lambda函数。
   - SNS可以确保消息的可靠传递，并触发目标Lambda函数。

4. **文本翻译与语音合成**：
   - 专门的Lambda函数接收SNS消息，进行翻译，并调用Polly生成音频。
   - Lambda函数监控SNS队列积压情况，根据积压情况调整播放速度。

5. **SNS队列监控与自动加速**：
   - 使用CloudWatch监控SNS队列的消息数。
   - Lambda函数根据队列消息数调整Polly语音合成的播放速度。

### 关键代码

#### 1. 前端音频捕捉与处理

使用WebRTC捕捉音频流并发送到AWS Lambda。

#### 2. AWS Lambda: Transcribe

Lambda函数处理音频，调用Transcribe进行语音识别，并通过SNS发送文本段落。

```javascript
const AWS = require('aws-sdk');
const transcribe = new AWS.TranscribeService();
const sns = new AWS.SNS();
const topicArn = 'arn:aws:sns:your-region:your-account-id:your-sns-topic';

exports.handler = async (event) => {
  try {
    const audioData = Buffer.from(event.audio, 'base64');

    // Step 1: Transcribe audio to text
    const transcription = await transcribeAudio(audioData);

    // Step 2: Process transcription to detect sentence boundaries
    const sentences = splitIntoSentences(transcription);

    // Step 3: Send each sentence to SNS for further processing
    for (const sentence of sentences) {
      await sendTextToSNS(sentence);
    }

    return { status: 'success' };
  } catch (err) {
    console.error('Error:', err);
    throw err;
  }
};

async function transcribeAudio(audioData) {
  const params = {
    LanguageCode: 'zh-CN',
    Media: {
      MediaFileUri: audioData
    },
    TranscriptionJobName: 'TranscriptionJob'
  };
  const data = await transcribe.startTranscriptionJob(params).promise();
  const transcriptUri = data.TranscriptionJob.Transcript.TranscriptFileUri;
  // Download the transcription result from S3
  const transcript = await s3.getObject({
    Bucket: 'your-output-bucket',
    Key: transcriptUri.split('/').pop()
  }).promise();
  return transcript.Body.toString('utf-8');
}

function splitIntoSentences(text) {
  // Implement sentence boundary detection logic here
  const sentences = text.split(/(?<=[。！？])/);
  return sentences;
}

async function sendTextToSNS(text) {
  const params = {
    Message: text,
    TopicArn: topicArn
  };
  await sns.publish(params).promise();
}
```

#### 3. AWS Lambda: Translate & Synthesize (监控SNS队列)

Lambda函数接收SNS消息，进行翻译和语音合成，并根据SNS队列积压情况调整播放速度。

```javascript
const AWS = require('aws-sdk');
const translate = new AWS.Translate();
const polly = new AWS.Polly();
const cloudwatch = new AWS.CloudWatch();
const sns = new AWS.SNS();

exports.handler = async (event) => {
  try {
    const message = event.Records[0].Sns.Message;

    // Step 1: Translate text to English
    const translatedText = await translateText(message);

    // Step 2: Monitor SNS queue depth to adjust playback speed
    const playbackSpeed = await getPlaybackSpeed();

    // Step 3: Synthesize speech from translated text
    const audioStream = await synthesizeSpeech(translatedText, playbackSpeed);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'audio/mp3'
      },
      body: audioStream.toString('base64'),
      isBase64Encoded: true
    };
  } catch (err) {
    console.error('Error:', err);
    throw err;
  }
};

async function translateText(text) {
  const params = {
    Text: text,
    SourceLanguageCode: 'zh',
    TargetLanguageCode: 'en'
  };
  const data = await translate.translateText(params).promise();
  return data.TranslatedText;
}

async function synthesizeSpeech(text, playbackSpeed) {
  const params = {
    Text: text,
    OutputFormat: 'mp3',
    VoiceId: 'Joanna',
    TextType: 'text',
    SpeechMarkTypes: ['sentence', 'ssml'],
    SampleRate: '16000',
    // Adjust playback speed based on SNS queue depth
    LexiconNames: ['speed-' + playbackSpeed]
  };
  const data = await polly.synthesizeSpeech(params).promise();
  return data.AudioStream;
}

async function getPlaybackSpeed() {
  const params = {
    Namespace: 'AWS/SNS',
    MetricName: 'NumberOfMessagesPublished',
    Dimensions: [
      {
        Name: 'TopicArn',
        Value: 'arn:aws:sns:your-region:your-account-id:your-sns-topic'
      }
    ],
    StartTime: new Date(new Date().getTime() - 5 * 60000), // last 5 minutes
    EndTime: new Date(),
    Period: 60, // 1 minute intervals
    Statistics: ['Sum']
  };
  const data = await cloudwatch.getMetricStatistics(params).promise();
  const queueDepth = data.Datapoints.reduce((sum, point) => sum + point.Sum, 0);

  if (queueDepth > 100) {
    return 'fast';
  } else if (queue

Depth > 50) {
    return 'normal';
  } else {
    return 'slow';
  }
}
```

这种方式确保了系统可以动态调整播放速度，以应对不同的积压情况，同时保持较高的实时性和响应速度。
