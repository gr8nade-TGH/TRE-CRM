import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
	'https://mevirooooypfjbsrmzrk.supabase.co',
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ldmlyb29vb3lwZmpic3JtenJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTcxNTUwOCwiZXhwIjoyMDc1MjkxNTA4fQ.bBGcPCsjEBBx6tgzmenJ6V7SGfzDJnAMoYBUpRUFAPA'
);

async function getAgents() {
	const { data, error } = await supabase
		.from('users')
		.select('id, name, email, role')
		.eq('role', 'AGENT')
		.limit(5);

	if (error) {
		console.error('Error:', error);
		return;
	}

	console.log('Agents:');
	data.forEach(agent => {
		console.log(`- ${agent.name} (${agent.email}) - ID: ${agent.id}`);
	});
}

getAgents();

