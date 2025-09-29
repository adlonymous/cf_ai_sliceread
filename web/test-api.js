// Simple test script to verify the API endpoints
const BASE_URL = 'http://localhost:3001'; // Updated to use port 3001

async function testAPI() {
  console.log('🧪 Testing Cerebras Document Chatbot API...\n');

  try {
    // Test documents API
    console.log('1. Testing documents API...');
    const docsResponse = await fetch(`${BASE_URL}/api/documents`);
    const docsData = await docsResponse.json();
    console.log(`✅ Documents API: Found ${docsData.total} documents`);
    console.log(`   First document: ${docsData.documents[0]?.title}\n`);

    // Test worker API integration
    console.log('2. Testing worker API integration...');
    const workerUrl = 'http://localhost:8787';
    try {
      const workerResponse = await fetch(`${workerUrl}/admin/textbooks`);
      if (workerResponse.ok) {
        const workerData = await workerResponse.json();
        console.log(`✅ Worker API: Found ${workerData.textbooks?.length || 0} textbooks`);
        if (workerData.textbooks?.length > 0) {
          console.log(`   First textbook: ${workerData.textbooks[0].title}\n`);
        }
      } else {
        console.log('⚠️  Worker API: Not available (this is expected if worker is not running)\n');
      }
    } catch (workerError) {
      console.log('⚠️  Worker API: Not available (this is expected if worker is not running)\n');
    }

    // Test chat API with a sample message
    console.log('3. Testing chat API...');
    const chatResponse = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'What is this textbook about?',
        textbookId: 'test-textbook',
        sessionId: 'test-session',
      }),
    });

    if (chatResponse.ok) {
      const chatData = await chatResponse.json();
      console.log('✅ Chat API: Response received');
      console.log(`   Response: ${chatData.message?.substring(0, 100)}...\n`);
    } else {
      console.log('❌ Chat API: Error response');
      const errorData = await chatResponse.json();
      console.log(`   Error: ${errorData.error}\n`);
    }

    // Test chat history retrieval
    console.log('4. Testing chat history retrieval...');
    const historyResponse = await fetch(
      `${BASE_URL}/api/chat?textbookId=test-textbook&sessionId=test-session`
    );
    
    if (historyResponse.ok) {
      const historyData = await historyResponse.json();
      console.log(`✅ Chat History: Retrieved ${historyData.messages?.length || 0} messages\n`);
    } else {
      console.log('❌ Chat History: Error retrieving history\n');
    }

    console.log('🎉 API testing completed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Open http://localhost:3001 in your browser');
    console.log('   2. Choose a textbook from the modal');
    console.log('   3. Start chatting with the AI about the textbook!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the development server is running: npm run dev');
  }
}

// Run the test
testAPI();
