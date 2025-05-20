'use client';

import { useState } from 'react';
import { 
  Drawer, Box, List, Divider, IconButton, ListItem, 
  ListItemButton, ListItemIcon, ListItemText
} from '@mui/material';
import {
  ChevronLeft, ChevronRight, Assessment, History, Settings
} from '@mui/icons-material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);

  const menuItems = [
    { text: 'Analysis', icon: <Assessment />, path: '/analysis' },
    { text: 'Chart', icon: <Assessment />, path: '/chart' },
    { text: 'History', icon: <History />, path: '/history' },
    { text: 'Settings', icon: <Settings />, path: '/settings' }
  ];

  return (
    <Box sx={{ display: 'flex' }}>
      <Drawer
        variant="persistent"
        anchor="left"
        open={open}
        sx={{
          width: 240,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 240,
            boxSizing: 'border-box',
          },
        }}
      >
        <Box sx={{ 
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px',
          minHeight: '64px',
          justifyContent: 'flex-end'
        }}>
          <IconButton onClick={() => setOpen(false)}>
            <ChevronLeft />
          </IconButton>
        </Box>
        <Divider />
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton 
                component={Link}
                href={item.path}
                selected={pathname === item.path}
              >
                <ListItemIcon sx={{ 
                  color: pathname === item.path ? 'primary.main' : 'inherit',
                  minWidth: '40px'
                }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>
      {!open && (
        <Box sx={{ position: 'fixed', left: 0, top: 64 }}>
          <IconButton onClick={() => setOpen(true)}>
            <ChevronRight />
          </IconButton>
        </Box>
      )}
    </Box>
  );
}