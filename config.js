window.APP_CONFIG = {
  supabaseUrl: 'https://espezmdpkoixnfchomqb.supabase.co',
  supabaseKey: 'sb_publishable_xP8z74zcMuCkj6xlu1bJ3w_Kudqbcu1',
  table: 'full_import',
  loginUsers: {
    admin: { username: 'admin', email: 'naappe@gmail.com' },
    pnc: { username: 'pnc2026', email: 'pnc2026@villimaledhaaira.local' }
  },
  sections: [
    { key: 'need-call', label: 'Need Call', field: 'phone_status', value: 'need-call' },
    { key: 'reached', label: 'Reached', field: 'reach_status', value: 'reached' },
    { key: 'will-vote', label: 'Will Vote', field: 'vote_status', value: 'will-vote' },
    { key: 'pending', label: 'Pending', field: 'vote_status', value: 'pending' },
    { key: 'no-phone', label: 'No Phone', field: 'phone_status', value: 'no-phone' },
    { key: 'need-transport', label: 'Need Transport', field: 'transport_status', value: 'need-transport' },
    { key: 'follow-up', label: 'Follow-up', field: 'd2d_status', value: 'follow-up' }
  ]
};
