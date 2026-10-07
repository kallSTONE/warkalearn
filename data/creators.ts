export interface Creator {
  id: number
  slug: string 
  name: string
  avatar: string
  bio: string  
  niche: string 
  followers: number 
  totalStudents: number 
  rating: number
}      
      
export const creators: Creator[] = [
  {
    id: 1,   
    slug: 'Daniel',
    name: 'Warka Learn Instructor',
    avatar: '/assets/images/creator-samuel.jpg',
    bio: 'A team of experienced instructors focused on practical skills, mentorship, and real-world outcomes.',
    niche: 'Tech • Language • Business Skills',
    followers: 52000,
    totalStudents: 2100,
    rating: 4.8,
  },   
]   
       
