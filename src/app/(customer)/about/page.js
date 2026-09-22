'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Award, ShieldCheck, Heart } from 'lucide-react';

const AboutPage = () => {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAboutData = async () => {
      try {
        const res = await fetch('/api/pages/about-us');
        const data = await res.json();
        if (data.success) {
          setPage(data.page);
        }
        setLoading(false);
      } catch (err) {
        console.log('Error loading about page:', err);
        setLoading(false);
      }
    };
    fetchAboutData();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid var(--bg-light-border)', borderTopColor: 'var(--text-dark)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '10px', color: 'var(--text-dark-muted)' }}>Loading story panels...</p>
      </div>
    );
  }

  return (
    <div className="container animate-fade" style={{ maxWidth: '800px', margin: '40px auto 80px' }}>
      <div className="breadcrumbs">
        <Link href="/">Home</Link>
        <span>/</span>
        <span style={{ color: 'var(--text-dark)' }}>About Us</span>
      </div>

      <article style={{ backgroundColor: 'white', border: '1px solid var(--bg-light-border)', borderRadius: 'var(--border-radius-md)', padding: '40px', boxShadow: 'var(--shadow-sm)' }}>
        <h1 style={{ fontSize: '2.2rem', fontFamily: 'Outfit', textTransform: 'uppercase', marginBottom: '24px', borderBottom: '2px solid var(--bg-light-border)', paddingBottom: '15px' }}>
          {page?.title || 'About ZAS Sport'}
        </h1>

        <div style={{ lineHeight: '1.8', color: 'var(--text-dark-muted)', fontSize: '0.95rem', whiteSpace: 'pre-line' }}>
          {page?.content || `We are a premium online cricket store offering county-grade bats, leather balls, high velocity helmets, and all accessory supplies.`}
        </div>

        {/* Company core pillars graphic */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginTop: '40px', paddingTop: '30px', borderTop: '1px solid var(--bg-light-border)' }}>
          <div style={{ textAlign: 'center' }}>
            <Award size={32} style={{ color: 'var(--text-dark)', marginBottom: '8px' }} />
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '4px' }}>Genuine Quality</h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dark-muted)' }}>Handpicked English and Kashmir willow bats directly sourced.</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <ShieldCheck size={32} style={{ color: 'var(--text-dark)', marginBottom: '8px' }} />
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '4px' }}>Tested Protection</h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dark-muted)' }}>All protective gear conforms to international safety standards.</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Heart size={32} style={{ color: 'var(--text-dark)', marginBottom: '8px' }} />
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '4px' }}>Player Centric</h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dark-muted)' }}>Dedicated support helpline and customized laser bat engraving.</p>
          </div>
        </div>
      </article>
    </div>
  );
};

export default AboutPage;
