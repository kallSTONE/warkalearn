// app/abou/page.tsx
'use client'

import React from 'react' 
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button' 
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Target, Sparkles } from 'lucide-react'

export default function AboutPage() {
  return (
    <main className="w-full mx-auto py-12 space-y-24">

      {/* ===== Hero Section ===== */}
      <section className="relative flex flex-col items-center text-center px-6 md:px-10 py-20 overflow-hidden bg-gradient-to-b from-background to-muted/30">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl space-y-6"
        >
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">
            Warka Learn — practical learning for modern careers
          </h1>  
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Warka Learn delivers tech, language, business, and creative courses with live sessions, projects, and
            a supportive community for learners in Ethiopia and beyond. Our goal is to make real-world
            training accessible, practical, and flexible for busy schedules.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/register"><Button size="lg">Get started</Button></Link>
            <Link href="/learn"><Button variant="outline" size="lg">Explore courses</Button></Link>
          </div>
          <div className="mt-6 flex gap-2 flex-wrap justify-center">
            <Badge>Skill-based</Badge>
            <Badge>Project-first</Badge>
            <Badge>Flexible schedules</Badge>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="mt-12"
        > 
          <Image
            src="/assets/images/learning_banner.jpg"
            alt="Warka Learn learning banner"
            width={1000}
            height={500}
            className="rounded-2xl shadow-lg"
          />
        </motion.div>
      </section>

      {/* ===== Our Story ===== */}
      <section className="px-6 md:px-10 text-center space-y-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl font-bold mb-4">Our story</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Warka Learn started in 2023 with a simple goal: help learners build practical skills with confidence.
            We believe progress comes from consistent practice, clear guidance, and a community that keeps
            you motivated. Today we build programs that connect learners with expert instructors and
            real-world projects.
          </p>
        </motion.div>
      </section> 

      {/* ===== Mission & Vision  ===== */}
      <section className="px-6 md:px-10 grid md:grid-cols-2 gap-8 items-center">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <Card className="p-6">
            <CardContent>
              <div className="flex items-center gap-3 mb-3">
                <Target className="text-primary" /> 
                <h3 className="text-2xl font-semibold">Our mission</h3>
              </div>   
              <p className="text-muted-foreground">
                Help learners build real-world skills with clarity and confidence for work, study, and growth.
                We focus on practical projects, applied knowledge, and measurable outcomes.
              </p>
            </CardContent>
          </Card>
        </motion.div>   

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <Card className="p-6">
            <CardContent>
              <div className="flex items-center gap-3 mb-3">
                <Sparkles className="text-primary" />
                <h3 className="text-2xl font-semibold">Our vision</h3>
              </div>
              <p className="text-muted-foreground">
                A future where every learner can access high-quality education with confidence and impact.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </section> 

      {/* ===== Our Values ===== */}
      <section className="px-6 md:px-10 text-center space-y-10">
        <h2 className="text-3xl font-bold">Our values</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: 'Clarity', desc: 'Clear explanations, simple goals, and measurable progress in every course.' },
            { title: 'Practice', desc: 'Speaking and writing practice is at the center of every lesson.' },
            { title: 'Community', desc: 'We learn better together with feedback, encouragement, and support.' },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="p-6 hover:shadow-lg transition">
                <h4 className="font-semibold mb-2">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </Card>
            </motion.div>
          ))}
        </div>    
      </section> 

      {/* ===== Impact Stats ===== */}
      <section className="px-6 md:px-10 text-center">
        <h2 className="text-3xl font-bold mb-10">Our impact</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { number: '2,150+', label: 'Active learners', color: 'from-green-500 to-emerald-300' },
            { number: '120+', label: 'Live practice sessions', color: 'from-indigo-500 to-sky-300' },
            { number: '40%', label: 'Confidence growth', color: 'from-yellow-400 to-orange-300' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className={`p-8 rounded-2xl bg-gradient-to-r ${stat.color} text-background font-semibold`}
            >
              <h3 className="text-4xl font-extrabold">{stat.number}</h3>
              <p className="mt-2 text-lg">{stat.label}</p>
            </motion.div>
          ))}
        </div>   
      </section>

      {/* ===== Team & Partners ===== */}
      <section className="px-6 md:px-10 grid md:grid-cols-2 gap-8 items-center">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl font-bold mb-4">Our team</h2>
          <p className="text-muted-foreground mb-6">
            We are a small, dedicated team of instructors, industry mentors, and curriculum designers
            committed to making practical learning engaging and effective.
          </p>
          <Link href="/register"><Button>Learn with us</Button></Link>
        </motion.div>  

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 gap-4"
        >
          <Image src="/assets/images/team1.jpg" alt="Warka Learn team member" width={300} height={300} className="rounded-xl object-cover" />
          <Image src="/assets/images/team2.jpg" alt="Warka Learn team member" width={300} height={300} className="rounded-xl object-cover" />
          <Image src="/assets/images/team3.jpg" alt="Warka Learn team member" width={300} height={300} className="rounded-xl object-cover" />
          <Image src="/assets/images/team4.jpg" alt="Warka Learn team member" width={300} height={300} className="rounded-xl object-cover" />
        </motion.div>
      </section>

      {/* ===== Call to Action ===== */}
      <section className="text-center px-6 md:px-10 py-16 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl font-bold mb-4">Join the Warka Learn community</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Whether you are starting your first course or leveling up professional skills, your journey
            starts here. Let us learn together.
          </p>  
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/register"><Button size="lg">Start learning</Button></Link>
            <Link href="/learn"><Button variant="outline" size="lg">Browse courses</Button></Link>
          </div> 
        </motion.div>
      </section>

    </main> 
  )
}
